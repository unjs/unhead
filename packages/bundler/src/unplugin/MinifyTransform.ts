import type { SourceMapInput } from 'rollup'
import type { BaseTransformerTypes } from './types'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { createUnplugin } from 'unplugin'
import { isVueScriptRequest, splitTransformId, withCodeFilter } from './utils'

const NODE_MODULES_RE = /[\\/]node_modules[\\/]/
const TRANSFORM_RE = /\.(?:(?:c|m)?j|t)sx?$/

const SKIP_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])
const HEAD_FN_NAMES = new Set(['useHead', 'useServerHead'])
const CONTENT_PROP_NAMES = ['innerHTML', 'textContent']
const CONTENT_PROPS = new Set(CONTENT_PROP_NAMES)
const MINIFY_CACHE_MAX = 100

type TagType = 'script' | 'style'

interface PendingMinification {
  end: number
  minified: Promise<string | null>
  raw: string
  start: number
}

export type MinifyFn = (code: string) => Promise<string | null>

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
}

/**
 * Vite/Webpack transform plugin that pre-minifies static string literals
 * inside `useHead()` / `useServerHead()` calls at build time.
 *
 * Uses esbuild (Vite 7) or rolldown (Vite 8+) for JS, and lightningcss for CSS.
 * These never enter the SSR runtime bundle since they run only in the Vite `transform` hook.
 */
export const MinifyTransform = createUnplugin<MinifyTransformOptions, false>((options: MinifyTransformOptions = {}) => {
  const jsMinifier = options.js !== false ? options.js : undefined
  const cssMinifier = options.css !== false ? options.css : undefined
  const doJS = !!jsMinifier
  const doCSS = !!cssMinifier

  const minifyCache: Record<TagType, Map<string, Promise<string | null>>> = {
    script: new Map(),
    style: new Map(),
  }

  return withCodeFilter({
    name: 'unhead:minify-transform',
    enforce: 'post',

    transformInclude(id) {
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
    },

    async transform(code, id) {
      if (!code.includes('useHead') && !code.includes('useServerHead'))
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
      const pendingMinifications: PendingMinification[] = []

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

              processScriptOrStyleObject(element, tagType, pendingMinifications)
            }
          }
        },
      })

      if (!pendingMinifications.length)
        return

      const minified = await Promise.all(pendingMinifications.map(pending => pending.minified))
      const s = new MagicString(code)

      for (let i = 0; i < pendingMinifications.length; i++) {
        const pending = pendingMinifications[i]
        const result = minified[i]
        if (result && result.length < pending.raw.length)
          s.overwrite(pending.start, pending.end, JSON.stringify(result))
      }

      if (!s.hasChanged())
        return

      return {
        code: s.toString(),
        map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
      }
    },
  }, /\buse(?:Server)?Head\b/)

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
    pendingMinifications: PendingMinification[],
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
        if (typeof raw !== 'string' || raw.length < 20)
          continue

        pendingMinifications.push({
          end: prop.value.end,
          minified: minifyStringContent(raw, tagType),
          raw,
          start: prop.value.start,
        })
      }
      else if (prop.value?.type === 'TemplateLiteral' && prop.value.expressions.length === 0) {
        const raw = prop.value.quasis[0]?.value?.cooked as string
        if (!raw || raw.length < 20)
          continue

        pendingMinifications.push({
          end: prop.value.end,
          minified: minifyStringContent(raw, tagType),
          raw,
          start: prop.value.start,
        })
      }
    }
  }

  function minifyStringContent(content: string, tagType: TagType): Promise<string | null> {
    const minifier = tagType === 'script' ? jsMinifier : cssMinifier
    if (!minifier)
      return Promise.resolve(null)

    const cache = minifyCache[tagType]
    const cached = cache.get(content)
    if (cached) {
      cache.delete(content)
      cache.set(content, cached)
      return cached
    }

    const pending: Promise<string | null> = Promise.resolve()
      .then(() => minifier(content))
      .catch((error) => {
        if (cache.get(content) === pending)
          cache.delete(content)
        throw error
      })
    cache.set(content, pending)

    if (cache.size > MINIFY_CACHE_MAX) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined)
        cache.delete(oldest)
    }

    return pending
  }
})
