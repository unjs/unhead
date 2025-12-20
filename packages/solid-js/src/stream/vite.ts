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

    if (node.body.type === 'JSXElement' || node.body.type === 'JSXFragment') {
      returns.push({ jsxStart: node.body.start, jsxEnd: node.body.end })
      return
    }

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

  returns.sort((a, b) => b.jsxStart - a.jsxStart)
  for (const ret of returns) {
    const jsxCode = code.slice(ret.jsxStart, ret.jsxEnd)
    s.overwrite(ret.jsxStart, ret.jsxEnd, `<><HeadStreamScript />${jsxCode}</>`)
  }

  const importPath = `@unhead/solid-js/stream/${isSSR ? 'server' : 'client'}`
  const imports = findStaticImports(code)
  const existing = imports.find(i => i.specifier === importPath)

  if (existing) {
    if (!existing.imports?.includes('HeadStreamScript')) {
      const inner = existing.imports?.replace(/^\{\s*|\s*\}\s*$/g, '').trim() || ''
      s.overwrite(existing.start, existing.end, `import { ${inner ? `${inner}, ` : ''}HeadStreamScript } from '${importPath}'\n`)
    }
  }
  else {
    const last = imports[imports.length - 1]
    if (last)
      s.appendLeft(last.end, `import { HeadStreamScript } from '${importPath}'\n`)
    else
      s.prepend(`import { HeadStreamScript } from '${importPath}'\n`)
  }

  return true
}

/**
 * Vite plugin for Solid streaming SSR support.
 */
export function unheadSolidPlugin(): VitePlugin {
  return createStreamingPlugin({
    name: 'unhead:solid',
    framework: '@unhead/solid-js',
    include: /\.[jt]sx$/,
    transform,
  })
}

export default unheadSolidPlugin
