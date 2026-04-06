import type { SourceMapInput } from 'rollup'
import type { BaseTransformerTypes } from './types'
import { pathToFileURL } from 'node:url'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { parseQuery, parseURL } from 'ufo'
import { createUnplugin } from 'unplugin'

const NODE_MODULES_RE = /[\\/]node_modules[\\/]/
const TRANSFORM_RE = /\.(?:(?:c|m)?j|t)sx?$/

const SKIP_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])

export type MinifyFn = (code: string) => Promise<string | null>

export interface MinifyTransformOptions extends BaseTransformerTypes {
  /**
   * Custom JS minifier function, or `false` to disable JS minification.
   *
   * Use a subpath import to get a preconfigured minifier:
   * - `@unhead/addons/minify/rolldown` (Vite 8+)
   * - `@unhead/addons/minify/esbuild` (Vite 7)
   */
  js?: false | MinifyFn
  /**
   * Custom CSS minifier function, or `false` to disable CSS minification.
   *
   * Use `@unhead/addons/minify/lightningcss` for a preconfigured minifier.
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

  // head composable names that accept script/style tags
  const HEAD_FN_NAMES = new Set(['useHead', 'useServerHead'])
  // properties that hold inline content
  const CONTENT_PROPS = new Set(['innerHTML', 'textContent'])

  return {
    name: 'unhead:minify-transform',
    enforce: 'post',

    transformInclude(id) {
      const { pathname, search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
      const { type } = parseQuery(search)

      if (NODE_MODULES_RE.test(pathname))
        return false

      if (options.filter?.include?.some(pattern => id.match(pattern)))
        return true

      if (options.filter?.exclude?.some(pattern => id.match(pattern)))
        return false

      // vue files
      if (pathname.endsWith('.vue') && (type === 'script' || !search))
        return true

      // js/ts files
      if (TRANSFORM_RE.test(pathname))
        return true

      return false
    },

    async transform(code, id) {
      if (!code.includes('useHead') && !code.includes('useServerHead'))
        return

      let ast
      try {
        ast = parseSync(id, code)
      }
      catch {
        return
      }

      const scopeTracker = new ScopeTracker()
      const s = new MagicString(code)
      const pendingMinifications: Promise<void>[] = []

      walk(ast.program, {
        scopeTracker,
        enter(node: any, _parent: any) {
          if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier')
            return

          // check if this is a useHead/useServerHead call (imported or auto-imported)
          const decl = scopeTracker.getDeclaration(node.callee.name)
          let originalName: string

          if (decl instanceof ScopeTrackerImport) {
            if (decl.node.type !== 'ImportSpecifier' || decl.node.imported.type !== 'Identifier')
              return
            originalName = decl.node.imported.name
          }
          else if (!decl && HEAD_FN_NAMES.has(node.callee.name)) {
            originalName = node.callee.name
          }
          else {
            return
          }

          if (!HEAD_FN_NAMES.has(originalName))
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

              processScriptOrStyleObject(element, tagType, code, s, pendingMinifications)
            }
          }
        },
      })

      await Promise.all(pendingMinifications)

      if (s.hasChanged()) {
        return {
          code: s.toString(),
          map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
        }
      }
    },
  }

  function processScriptOrStyleObject(
    objectNode: any,
    tagType: 'script' | 'style',
    code: string,
    s: MagicString,
    pendingMinifications: Promise<void>[],
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
        const raw = prop.value.value as string
        if (raw.length < 20)
          continue

        pendingMinifications.push(
          minifyStringContent(raw, tagType).then((minified) => {
            if (minified && minified.length < raw.length) {
              // replace the string literal value (keep the quotes)
              s.overwrite(prop.value.start, prop.value.end, JSON.stringify(minified))
            }
          }),
        )
      }
      else if (prop.value?.type === 'TemplateLiteral' && prop.value.expressions.length === 0) {
        const raw = prop.value.quasis[0]?.value?.cooked as string
        if (!raw || raw.length < 20)
          continue

        pendingMinifications.push(
          minifyStringContent(raw, tagType).then((minified) => {
            if (minified && minified.length < raw.length) {
              s.overwrite(prop.value.start, prop.value.end, JSON.stringify(minified))
            }
          }),
        )
      }
    }
  }

  async function minifyStringContent(content: string, tagType: 'script' | 'style'): Promise<string | null> {
    if (tagType === 'script' && jsMinifier)
      return jsMinifier(content)
    if (tagType === 'style' && cssMinifier)
      return cssMinifier(content)
    return null
  }
})
