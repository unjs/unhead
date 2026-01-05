import type { StreamingPluginOptions } from 'unhead/stream/vite'
import MagicString from 'magic-string'
import { findStaticImports } from 'mlly'
import { parseSync, Visitor } from 'oxc-parser'
import { createStreamingPlugin } from 'unhead/stream/vite'

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
  const result = parseSync(id, code, { lang })

  if (result.errors.length > 0)
    return false

  // Find function components that contain useHead and have JSX returns
  const returns: { jsxStart: number, jsxEnd: number }[] = []

  const visitor = new Visitor({
    FunctionDeclaration: node => processFunction(node),
    FunctionExpression: node => processFunction(node),
    ArrowFunctionExpression: node => processFunction(node),
  })

  function processFunction(node: any) {
    if (!node.body)
      return

    const bodyCode = code.slice(node.body.start, node.body.end)
    if (!bodyCode.includes('useHead') && !bodyCode.includes('useSeoMeta') && !bodyCode.includes('useHeadSafe'))
      return

    // Arrow with implicit JSX return
    if (node.body.type === 'JSXElement' || node.body.type === 'JSXFragment') {
      returns.push({ jsxStart: node.body.start, jsxEnd: node.body.end })
      return
    }

    // Find return statements with JSX
    const innerVisitor = new Visitor({
      ReturnStatement(innerNode: any) {
        if (!innerNode.argument)
          return
        let arg = innerNode.argument
        if (arg.type === 'ParenthesizedExpression' && arg.expression)
          arg = arg.expression
        if (arg.type === 'JSXElement' || arg.type === 'JSXFragment')
          returns.push({ jsxStart: arg.start, jsxEnd: arg.end })
      },
    })
    innerVisitor.visit(node.body)
  }

  visitor.visit(result.program)

  if (returns.length === 0)
    return false

  // Wrap JSX returns with HeadStream (reverse order to maintain positions)
  returns.sort((a, b) => b.jsxStart - a.jsxStart)
  for (const ret of returns) {
    const jsxCode = code.slice(ret.jsxStart, ret.jsxEnd)
    s.overwrite(ret.jsxStart, ret.jsxEnd, `<><HeadStream />${jsxCode}</>`)
  }

  // Add import
  const importPath = isSSR ? '@unhead/solid-js/stream/server' : '@unhead/solid-js/stream/client'
  const imports = findStaticImports(code)
  const existing = imports.find(i => i.specifier === importPath)

  if (existing) {
    if (!existing.imports?.includes('HeadStream')) {
      const inner = existing.imports?.replace(/^\{\s*|\s*\}\s*$/g, '').trim() || ''
      s.overwrite(existing.start, existing.end, `import { ${inner ? `${inner}, ` : ''}HeadStream } from '${importPath}'\n`)
    }
  }
  else {
    const last = imports[imports.length - 1]
    if (last)
      s.appendLeft(last.end, `import { HeadStream } from '${importPath}'\n`)
    else
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
  return createStreamingPlugin({
    framework: '@unhead/solid-js',
    mode: options?.mode,
    transform(code, id, opts) {
      // Only process jsx/tsx files
      if (!/\.[jt]sx$/.test(id))
        return null

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
