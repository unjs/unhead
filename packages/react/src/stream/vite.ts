import type { StreamingPluginContext, VitePlugin } from 'unhead/stream/vite'
import { findStaticImports } from 'mlly'
import { parseSync, Visitor } from 'oxc-parser'
import { createStreamingPlugin } from 'unhead/stream/vite'

export type { VitePlugin }

function transform(ctx: StreamingPluginContext): boolean {
  const { code, id, isSSR, s } = ctx

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
  const importPath = isSSR ? '@unhead/react/stream/server' : '@unhead/react/stream/client'
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
 * Vite plugin for React streaming SSR support.
 */
export function unheadReactPlugin(): VitePlugin {
  return createStreamingPlugin({
    name: 'unhead:react',
    framework: '@unhead/react',
    include: /\.[jt]sx$/,
    transform,
  })
}

export default unheadReactPlugin
