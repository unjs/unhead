import type { SourceMapInput } from 'rollup'
import type { BuildOptions } from 'vite'
import type { BaseTransformerTypes } from './types'
import MagicString from 'magic-string'
import { ScopeTracker, ScopeTrackerImport } from 'oxc-walker'
import { minifyJSON } from 'unhead/minify'
import { createUnplugin } from 'unplugin'
import { isMissingParserError, parseAndWalkSource } from './parser'
import { createJsVueTransformIdFilter, isVueScriptRequest, NODE_MODULES_RE, splitTransformId } from './utils'

const TRANSFORM_RE = /\.(?:(?:c|m)?j|t)sx?$/
const HEAD_RE = /\buse(?:Server)?Head\b/

const JSON_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])
const JAVASCRIPT_TYPES = new Set([
  '',
  'application/ecmascript',
  'application/javascript',
  'application/x-ecmascript',
  'application/x-javascript',
  'module',
  'text/ecmascript',
  'text/javascript',
  'text/javascript1.0',
  'text/javascript1.1',
  'text/javascript1.2',
  'text/javascript1.3',
  'text/javascript1.4',
  'text/javascript1.5',
  'text/jscript',
  'text/livescript',
  'text/x-ecmascript',
  'text/x-javascript',
])
const HEAD_FN_NAMES = new Set(['useHead', 'useServerHead'])
const CONTENT_PROP_NAMES = ['innerHTML', 'textContent']
const CONTENT_PROPS = new Set(CONTENT_PROP_NAMES)
const MINIFY_CACHE_MAX = 100

type ContentType = 'script' | 'style' | 'json'
type TagType = Exclude<ContentType, 'json'>

interface PendingTransform {
  end: number
  replaceIfLonger: boolean
  raw: string
  start: number
  transformed: Promise<string | null>
}

export type MinifyFn = (code: string) => Promise<string | null>
type InlineScriptTranspiler = (code: string, target: BuildOptions['target']) => Promise<string | null>
type ViteTransformTarget = Exclude<BuildOptions['target'], false>
type ViteTransformApi = Pick<typeof import('vite'), 'resolveConfig' | 'transformWithEsbuild'> & Partial<Pick<typeof import('vite'), 'transformWithOxc'>>

const resolvedBaselineTargets = new WeakMap<ViteTransformApi, Promise<ViteTransformTarget>>()

function resolveViteTransformTarget(vite: ViteTransformApi, target: ViteTransformTarget): Promise<ViteTransformTarget> {
  if (target !== 'baseline-widely-available')
    return Promise.resolve(target)

  let resolved = resolvedBaselineTargets.get(vite)
  if (!resolved) {
    resolved = vite.resolveConfig({
      configFile: false,
      build: { target },
    }, 'build').then(async (config) => {
      if (config.build.target !== target)
        return config.build.target === false ? undefined : config.build.target

      // Vite 6 predates the baseline alias. Its `modules` target is the
      // closest Vite-owned compatibility target and is already normalized.
      const fallback = await vite.resolveConfig({
        configFile: false,
        build: { target: 'modules' },
      }, 'build')
      return fallback.build.target === false ? undefined : fallback.build.target
    })
    resolvedBaselineTargets.set(vite, resolved)
  }
  return resolved
}

export async function transformInlineScriptWithVite(vite: ViteTransformApi, code: string, target: BuildOptions['target']): Promise<string> {
  if (target === false)
    return code

  const resolvedTarget = await resolveViteTransformTarget(vite, target)

  if (typeof vite.transformWithOxc === 'function') {
    const result = await vite.transformWithOxc(code, 'unhead-inline-script.js', {
      lang: 'js',
      sourcemap: false,
      target: resolvedTarget,
    })
    return result.code.trim()
  }

  const result = await vite.transformWithEsbuild(code, 'unhead-inline-script.js', {
    loader: 'js',
    target: resolvedTarget,
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

const jsonMinifier: MinifyFn = code => Promise.resolve(minifyJSON(code))

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

  const transformCache: Record<ContentType, Map<string, Promise<string | null>>> = {
    json: new Map(),
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

        const scopeTracker = new ScopeTracker()
        const pendingTransforms: PendingTransform[] = []
        const environmentTarget = (this as { environment?: { config?: { build?: BuildOptions } } }).environment?.config?.build?.target
        const inlineScriptTarget = transpileOptions?.target ?? environmentTarget ?? resolvedViteTarget

        try {
          parseAndWalkSource(code, id, {
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
                if (prop.type !== 'Property')
                  continue

                const tagType = resolveStaticPropertyName(prop)
                if (tagType !== 'script' && tagType !== 'style')
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
        }
        catch (error) {
          if (isMissingParserError(error))
            throw error
          // Invalid source is left unchanged for the bundler's parser to report.
          return
        }

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
    let contentType: ContentType = tagType
    if (tagType === 'script') {
      const typeProp = objectNode.properties.find(
        (p: any) => p.type === 'Property'
          && resolveStaticPropertyName(p) === 'type',
      )
      if (typeProp) {
        if (typeProp.value?.type !== 'Literal' || typeof typeProp.value.value !== 'string')
          return
        const scriptType = typeProp.value.value.toLowerCase()
        if (JSON_TYPES.has(scriptType))
          contentType = 'json'
        else if (!JAVASCRIPT_TYPES.has(scriptType))
          return
      }
      if (contentType === 'script' && !doJS)
        return
    }

    // find innerHTML or textContent property with a static string value
    for (const prop of objectNode.properties) {
      if (prop.type !== 'Property')
        continue

      const contentProp = resolveStaticPropertyName(prop)
      if (!contentProp || !CONTENT_PROPS.has(contentProp))
        continue

      // only handle static string literals and template literals without expressions
      if (prop.value?.type === 'Literal') {
        const raw = prop.value.value
        const minLength = contentType === 'script' && jsTranspiler ? 0 : 20
        if (typeof raw !== 'string' || raw.length < minLength)
          continue

        pendingTransforms.push({
          end: prop.value.end,
          replaceIfLonger: contentType === 'script' && !!jsTranspiler,
          raw,
          start: prop.value.start,
          transformed: transformStringContent(raw, contentType, inlineScriptTarget),
        })
      }
      else if (prop.value?.type === 'TemplateLiteral' && prop.value.expressions.length === 0) {
        const raw = prop.value.quasis[0]?.value?.cooked as string
        const minLength = contentType === 'script' && jsTranspiler ? 0 : 20
        if (!raw || raw.length < minLength)
          continue

        pendingTransforms.push({
          end: prop.value.end,
          replaceIfLonger: contentType === 'script' && !!jsTranspiler,
          raw,
          start: prop.value.start,
          transformed: transformStringContent(raw, contentType, inlineScriptTarget),
        })
      }
    }
  }

  function resolveStaticPropertyName(prop: any): string | undefined {
    if (prop.key?.type === 'Identifier')
      return prop.key.name
    if (prop.key?.type === 'Literal' && typeof prop.key.value === 'string')
      return prop.key.value
  }

  function transformStringContent(content: string, contentType: ContentType, inlineScriptTarget: BuildOptions['target']): Promise<string | null> {
    const minifier = contentType === 'json'
      ? jsonMinifier
      : contentType === 'script' ? jsMinifier : cssMinifier
    const transpiler = contentType === 'script' ? jsTranspiler : undefined
    if (!minifier && !transpiler)
      return Promise.resolve(null)

    const cache = transformCache[contentType]
    const cacheKey = transpiler
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
        if (transpiler)
          result = await transpiler(result, inlineScriptTarget) || result
        if (minifier)
          result = await minifier(result) || result
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
