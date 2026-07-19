import type { SourceMapInput } from 'rollup'
import type { BuildOptions } from 'vite'
import type { BaseTransformerTypes } from './types'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { createUnplugin } from 'unplugin'
import { createJsVueTransformIdFilter, isVueScriptRequest, NODE_MODULES_RE, splitTransformId } from './utils'

const TRANSFORM_RE = /\.(?:(?:c|m)?j|t)sx?$/
const HEAD_RE = /\buse(?:Server)?Head\b/

const SKIP_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])
const HEAD_FN_NAMES = new Set(['useHead', 'useServerHead'])
const CONTENT_PROP_NAMES = ['innerHTML', 'textContent']
const CONTENT_PROPS = new Set(CONTENT_PROP_NAMES)
const MINIFY_CACHE_MAX = 100

type TagType = 'script' | 'style'

interface PendingTransform {
  end: number
  replaceIfLonger: boolean
  raw: string
  start: number
  transformed: Promise<string | null>
}

export type MinifyFn = (code: string) => Promise<string | null>
type InlineScriptTranspiler = (code: string, target: BuildOptions['target']) => Promise<string | null>
type ViteTransformApi = Pick<typeof import('vite'), 'transformWithEsbuild'> & Partial<Pick<typeof import('vite'), 'transformWithOxc'>>

export async function transformInlineScriptWithVite(vite: ViteTransformApi, code: string, target: BuildOptions['target']): Promise<string> {
  if (target === false)
    return code

  if (typeof vite.transformWithOxc === 'function') {
    const result = await vite.transformWithOxc(code, 'unhead-inline-script.js', {
      lang: 'js',
      sourcemap: false,
      target,
    })
    return result.code.trim()
  }

  const result = await vite.transformWithEsbuild(code, 'unhead-inline-script.js', {
    loader: 'js',
    target,
  })
  return result.code.trim()
}

export interface InlineScriptTransformOptions {
  /**
   * Override the JavaScript target used for inline scripts. When omitted,
   * Vite's resolved `build.target` is used.
   */
  target?: BuildOptions['target']
}

export interface MinifyTransformOptions extends BaseTransformerTypes {
  /**
   * Custom JS minifier function, or `false` to disable JS minification.
   *
   * Use a subpath import to get a preconfigured minifier:
   * - `@unhead/bundler/minify/rolldown` (Vite 8+)
   * - `@unhead/bundler/minify/esbuild` (Vite 7)
   */
  js?: false | MinifyFn
  /**
   * Custom CSS minifier function, or `false` to disable CSS minification.
   *
   * Use `@unhead/bundler/minify/lightningcss` for a preconfigured minifier.
   */
  css?: false | MinifyFn
  /**
   * Transpile inline JavaScript before optional minification.
   *
   * Vite builds inherit the resolved `build.target`; pass an object to
   * override it. Other bundlers currently require a custom `js` transform.
   */
  transpile?: boolean | InlineScriptTransformOptions
}

interface MinifyTransformPluginOptions {
  minify?: MinifyTransformOptions | false
  transformInlineScripts?: InlineScriptTransformOptions | false
}

export function resolveMinifyTransformOptions(options: MinifyTransformPluginOptions): MinifyTransformOptions | undefined {
  const minifyOptions = options.minify !== false && typeof options.minify === 'object' ? options.minify : {}
  const transpile = options.transformInlineScripts === false
    ? false
    : typeof options.transformInlineScripts === 'object'
      ? options.transformInlineScripts
      : true

  if (!minifyOptions.js && !minifyOptions.css && !transpile)
    return

  return { ...minifyOptions, transpile }
}

/**
 * Vite/Webpack transform plugin that processes static string literals inside
 * `useHead()` / `useServerHead()` calls at build time.
 *
 * Vite can transpile inline scripts to its resolved build target. Optional
 * minifiers use esbuild/rolldown for JS and lightningcss for CSS. These never
 * enter the SSR runtime bundle because they run only in build hooks.
 */
export const MinifyTransform = createUnplugin<MinifyTransformOptions, false>((options: MinifyTransformOptions = {}, meta) => {
  const jsMinifier = options.js !== false ? options.js : undefined
  const cssMinifier = options.css !== false ? options.css : undefined
  const transpileOptions = typeof options.transpile === 'object' ? options.transpile : undefined
  const shouldTranspile = options.transpile === true || !!transpileOptions
  let resolvedViteTarget: BuildOptions['target']
  const jsTranspiler: InlineScriptTranspiler | undefined = shouldTranspile && meta.framework === 'vite'
    ? async (code, target) => {
      const vite = await import('vite')
      return transformInlineScriptWithVite(vite, code, target)
    }
    : undefined
  const doJS = !!jsMinifier || !!jsTranspiler
  const doCSS = !!cssMinifier

  const transformCache: Record<TagType, Map<string, Promise<string | null>>> = {
    script: new Map(),
    style: new Map(),
  }

  function shouldTransformId(id: string): boolean {
    const { pathname, query } = splitTransformId(id)

    if (NODE_MODULES_RE.test(pathname))
      return false

    if (options.filter?.include?.some(pattern => id.match(pattern)))
      return true

    if (options.filter?.exclude?.some(pattern => id.match(pattern)))
      return false

    // vue files
    if (isVueScriptRequest(pathname, query))
      return true

    // js/ts files
    if (TRANSFORM_RE.test(pathname))
      return true

    return false
  }

  function shouldTransformCode(code: string): boolean {
    return HEAD_RE.test(code)
  }

  return {
    name: 'unhead:minify-transform',
    enforce: 'post',
    transformInclude: shouldTransformId,

    vite: jsTranspiler
      ? {
          configResolved(config) {
            resolvedViteTarget = config.build.target
          },
        }
      : undefined,

    transform: {
      filter: {
        code: HEAD_RE,
        id: createJsVueTransformIdFilter(options.filter?.include),
      },
      async handler(code, id) {
        if (!shouldTransformId(id))
          return

        if (!shouldTransformCode(code))
          return

        // Escaped identifiers still need parsing because their source does not
        // contain the decoded property name.
        if (!CONTENT_PROP_NAMES.some(name => code.includes(name)) && !code.includes('\\u'))
          return

        let ast
        try {
          ast = parseSync(id, code)
        }
        catch {
          return
        }

        const scopeTracker = new ScopeTracker()
        const pendingTransforms: PendingTransform[] = []
        const environmentTarget = (this as { environment?: { config?: { build?: BuildOptions } } }).environment?.config?.build?.target
        const inlineScriptTarget = transpileOptions?.target ?? environmentTarget ?? resolvedViteTarget

        walk(ast.program, {
          scopeTracker,
          enter(node: any, _parent: any) {
            if (node.type !== 'CallExpression')
              return

            if (!resolveHeadFunctionName(node.callee, scopeTracker))
              return

            const arg = node.arguments[0]
            if (!arg || arg.type !== 'ObjectExpression')
              return

            // look for script: [...] and style: [...] properties
            for (const prop of arg.properties) {
              if (prop.type !== 'Property' || prop.key?.type !== 'Identifier')
                continue

              const tagType = prop.key.name
              if (tagType !== 'script' && tagType !== 'style')
                continue

              if (tagType === 'script' && !doJS)
                continue
              if (tagType === 'style' && !doCSS)
                continue

              // handle both array and single object: script: [{ innerHTML: '...' }] or script: { innerHTML: '...' }
              const elements = prop.value?.type === 'ArrayExpression'
                ? prop.value.elements
                : [prop.value]

              for (const element of elements) {
                if (!element || element.type !== 'ObjectExpression')
                  continue

                processScriptOrStyleObject(element, tagType, pendingTransforms, inlineScriptTarget)
              }
            }
          },
        })

        if (!pendingTransforms.length)
          return

        const transformed = await Promise.all(pendingTransforms.map(pending => pending.transformed))
        const s = new MagicString(code)

        for (let i = 0; i < pendingTransforms.length; i++) {
          const pending = pendingTransforms[i]
          const result = transformed[i]
          if (result && result !== pending.raw && (pending.replaceIfLonger || result.length < pending.raw.length))
            s.overwrite(pending.start, pending.end, JSON.stringify(result))
        }

        if (!s.hasChanged())
          return

        return {
          code: s.toString(),
          map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
        }
      },
    },
  }

  function resolveHeadFunctionName(callee: any, scopeTracker: ScopeTracker): string | undefined {
    if (callee.type === 'Identifier') {
      const decl = scopeTracker.getDeclaration(callee.name)

      if (decl instanceof ScopeTrackerImport) {
        if (decl.node.type === 'ImportSpecifier'
          && decl.node.imported.type === 'Identifier'
          && HEAD_FN_NAMES.has(decl.node.imported.name)) {
          return decl.node.imported.name
        }
      }
      else if (!decl && HEAD_FN_NAMES.has(callee.name)) {
        return callee.name
      }
      return
    }

    if (callee.type !== 'MemberExpression'
      || callee.computed
      || callee.object.type !== 'Identifier'
      || callee.property.type !== 'Identifier'
      || !HEAD_FN_NAMES.has(callee.property.name)) {
      return
    }

    const decl = scopeTracker.getDeclaration(callee.object.name)
    if (decl instanceof ScopeTrackerImport && decl.node.type === 'ImportNamespaceSpecifier')
      return callee.property.name
  }

  function processScriptOrStyleObject(
    objectNode: any,
    tagType: TagType,
    pendingTransforms: PendingTransform[],
    inlineScriptTarget: BuildOptions['target'],
  ) {
    // for scripts, check if it's a skippable type
    if (tagType === 'script') {
      const typeProp = objectNode.properties.find(
        (p: any) => p.type === 'Property' && p.key?.type === 'Identifier' && p.key.name === 'type',
      )
      if (typeProp?.value?.type === 'Literal' && SKIP_JS_TYPES.has(typeProp.value.value))
        return
    }

    // find innerHTML or textContent property with a static string value
    for (const prop of objectNode.properties) {
      if (prop.type !== 'Property' || prop.key?.type !== 'Identifier')
        continue

      if (!CONTENT_PROPS.has(prop.key.name))
        continue

      // only handle static string literals and template literals without expressions
      if (prop.value?.type === 'Literal') {
        const raw = prop.value.value
        const minLength = tagType === 'script' && jsTranspiler ? 0 : 20
        if (typeof raw !== 'string' || raw.length < minLength)
          continue

        pendingTransforms.push({
          end: prop.value.end,
          replaceIfLonger: tagType === 'script' && !!jsTranspiler,
          raw,
          start: prop.value.start,
          transformed: transformStringContent(raw, tagType, inlineScriptTarget),
        })
      }
      else if (prop.value?.type === 'TemplateLiteral' && prop.value.expressions.length === 0) {
        const raw = prop.value.quasis[0]?.value?.cooked as string
        const minLength = tagType === 'script' && jsTranspiler ? 0 : 20
        if (!raw || raw.length < minLength)
          continue

        pendingTransforms.push({
          end: prop.value.end,
          replaceIfLonger: tagType === 'script' && !!jsTranspiler,
          raw,
          start: prop.value.start,
          transformed: transformStringContent(raw, tagType, inlineScriptTarget),
        })
      }
    }
  }

  function transformStringContent(content: string, tagType: TagType, inlineScriptTarget: BuildOptions['target']): Promise<string | null> {
    if (tagType === 'script' ? !doJS : !doCSS)
      return Promise.resolve(null)

    const cache = transformCache[tagType]
    const cacheKey = tagType === 'script' && jsTranspiler
      ? `${JSON.stringify(inlineScriptTarget)}\0${content}`
      : content
    const cached = cache.get(cacheKey)
    if (cached) {
      cache.delete(cacheKey)
      cache.set(cacheKey, cached)
      return cached
    }

    const pending: Promise<string | null> = Promise.resolve()
      .then(async () => {
        let result = content
        if (tagType === 'script') {
          if (jsTranspiler)
            result = await jsTranspiler(result, inlineScriptTarget) || result
          if (jsMinifier)
            result = await jsMinifier(result) || result
        }
        else if (cssMinifier) {
          result = await cssMinifier(result) || result
        }
        return result === content ? null : result
      })
      .catch((error) => {
        if (cache.get(cacheKey) === pending)
          cache.delete(cacheKey)
        throw error
      })
    cache.set(cacheKey, pending)

    if (cache.size > MINIFY_CACHE_MAX) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined)
        cache.delete(oldest)
    }

    return pending
  }
})
