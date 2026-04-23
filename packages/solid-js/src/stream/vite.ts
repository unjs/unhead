import type { StreamingPluginOptions } from 'unhead/stream/vite'
import MagicString from 'magic-string'
import { parseAndWalk } from 'oxc-walker'
import { createStreamingVitePlugin } from 'unhead/stream/vite'

const FILTER_RE = /\.[jt]sx$/

/**
 * Transforms Solid.js JSX code to inject HeadStream components for streaming SSR support.
 *
 * @param code - The source code to transform
 * @param id - The file path/id being transformed
 * @param isSSR - Whether the code is being transformed for SSR
 * @param s - MagicString instance for code manipulation
 * @returns `true` if transformations were applied, `false` otherwise
 *
 * @example
 * ```tsx
 * // Input code:
 * import { useHead } from '@unhead/solid-js'
 *
 * export function MyComponent() {
 *   useHead({
 *     title: 'My Page'
 *   })
 *   return <div>Hello World</div>
 * }
 *
 * // Transformed output (SSR):
 * import { useHead } from '@unhead/solid-js'
 * import { HeadStream } from '@unhead/solid-js/stream/server'
 *
 * export function MyComponent() {
 *   useHead({
 *     title: 'My Page'
 *   })
 *   return <><HeadStream /><div>Hello World</div></>
 * }
 * ```
 */
function transform(code: string, id: string, isSSR: boolean, s: MagicString): boolean {
  const lang = id.endsWith('.tsx') ? 'tsx' : id.endsWith('.jsx') ? 'jsx' : 'tsx'

  const returns: { jsxStart: number, jsxEnd: number }[] = []
  let currentFnHasHead = false
  const fnStack: boolean[] = []

  const importPath = isSSR ? '@unhead/solid-js/stream/server' : '@unhead/solid-js/stream/client'
  let existingImport: { start: number, end: number, specifiers: string[] } | null = null
  let lastImportEnd = -1

  const result = parseAndWalk(code, id, {
    parseOptions: { lang },
    enter(node: any) {
      if (node.type === 'ImportDeclaration') {
        if (node.source.value === importPath) {
          existingImport = {
            start: node.start,
            end: node.end,
            specifiers: node.specifiers?.map((spec: any) => spec.local?.name).filter(Boolean) || [],
          }
        }
        if (node.end > lastImportEnd)
          lastImportEnd = node.end
        this.skip()
        return
      }

      const isFn = node.type === 'FunctionDeclaration'
        || node.type === 'FunctionExpression'
        || node.type === 'ArrowFunctionExpression'

      if (isFn) {
        fnStack.push(currentFnHasHead)
        if (!node.body) {
          currentFnHasHead = false
          return
        }
        const bodyCode = code.slice(node.body.start, node.body.end)
        currentFnHasHead = bodyCode.includes('useHead') || bodyCode.includes('useSeoMeta') || bodyCode.includes('useHeadSafe')

        // Arrow with implicit JSX return
        if (currentFnHasHead && (node.body.type === 'JSXElement' || node.body.type === 'JSXFragment')) {
          returns.push({ jsxStart: node.body.start, jsxEnd: node.body.end })
        }
        return
      }

      if (currentFnHasHead && node.type === 'ReturnStatement') {
        if (!node.argument)
          return
        let arg = node.argument
        if (arg.type === 'ParenthesizedExpression' && arg.expression)
          arg = arg.expression
        if (arg.type === 'JSXElement' || arg.type === 'JSXFragment')
          returns.push({ jsxStart: arg.start, jsxEnd: arg.end })
      }
    },
    leave(node: any) {
      const isFn = node.type === 'FunctionDeclaration'
        || node.type === 'FunctionExpression'
        || node.type === 'ArrowFunctionExpression'
      if (isFn) {
        currentFnHasHead = fnStack.pop()!
      }
    },
  })

  if (result.errors.length > 0)
    return false

  if (returns.length === 0)
    return false

  // Wrap JSX returns with HeadStream (reverse order to maintain positions)
  returns.sort((a, b) => b.jsxStart - a.jsxStart)
  for (const ret of returns) {
    const jsxCode = code.slice(ret.jsxStart, ret.jsxEnd)
    s.overwrite(ret.jsxStart, ret.jsxEnd, `<><HeadStream />${jsxCode}</>`)
  }

  // Add import
  const foundImport = existingImport as { start: number, end: number, specifiers: string[] } | null
  if (foundImport) {
    if (!foundImport.specifiers.includes('HeadStream')) {
      const inner = foundImport.specifiers.join(', ')
      s.overwrite(foundImport.start, foundImport.end, `import { ${inner ? `${inner}, ` : ''}HeadStream } from '${importPath}'`)
    }
  }
  else if (lastImportEnd > -1) {
    s.appendLeft(lastImportEnd, `\nimport { HeadStream } from '${importPath}'`)
  }
  else {
    s.prepend(`import { HeadStream } from '${importPath}'\n`)
  }

  return true
}

/**
 * Vite plugin for Solid.js streaming SSR support.
 * Automatically injects HeadStream components into Solid components that use useHead hooks.
 *
 * @returns Vite plugin configuration object with:
 *   - `name`: Plugin identifier
 *   - `enforce`: Plugin execution order ('pre')
 *   - `transform`: Transform hook for processing JSX/TSX files
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { unheadSolidPlugin } from '@unhead/solid-js/stream/vite'
 *
 * export default {
 *   plugins: [
 *     unheadSolidPlugin()
 *   ]
 * }
 * ```
 */
export function unheadSolidPlugin(options?: Pick<StreamingPluginOptions, 'mode'>) {
  return createStreamingVitePlugin({
    framework: '@unhead/solid-js',
    filter: FILTER_RE,
    mode: options?.mode,
    transform(code: string, id: string, opts?: { ssr?: boolean }) {
      const s = new MagicString(code)
      if (!transform(code, id, opts?.ssr ?? false, s))
        return null

      return {
        code: s.toString(),
        map: s.generateMap({ includeContent: true, source: id }),
      }
    },
  })
}

export default unheadSolidPlugin
