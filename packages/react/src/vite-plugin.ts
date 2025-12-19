import type { UnheadPluginContext, UnheadPluginOptions, VitePlugin } from 'unhead/vite-plugin'
import { findStaticImports } from 'mlly'
import { parseSync, Visitor } from 'oxc-parser'
import { createUnheadPlugin } from 'unhead/vite-plugin'

export interface UnheadReactPluginOptions extends UnheadPluginOptions {
  /**
   * @default /\.[jt]sx$/
   */
  include?: RegExp
  /**
   * Enable streaming mode - transforms useHead calls to output inline scripts
   * @default false
   */
  streaming?: boolean
}

interface UseHeadCall {
  start: number
  end: number
  hasReturn: boolean // whether the call is part of a return/assignment
}

function transform(ctx: UnheadPluginContext & { streaming?: boolean }): boolean {
  const { code, id, isSSR, s, onlyWithUseHead, streaming } = ctx

  if (onlyWithUseHead && !code.includes('useHead'))
    return false

  const lang = id.endsWith('.tsx') ? 'tsx' : id.endsWith('.jsx') ? 'jsx' : 'tsx'
  const result = parseSync(id, code, { lang })

  if (result.errors.length > 0)
    return false

  // For streaming mode, transform useHead calls (both SSR and client for hydration match)
  if (streaming) {
    return transformStreaming(ctx, result, isSSR)
  }

  // Original Suspense-based HeadStream injection (for non-streaming mode)
  const locations: { position: number, selfClosing: boolean }[] = []

  const visitor = new Visitor({
    JSXElement(node: any) {
      const openingElement = node.openingElement
      if (!openingElement)
        return
      const name = openingElement.name
      if (!name || name.type !== 'JSXIdentifier' || name.name !== 'Suspense')
        return

      if (openingElement.selfClosing) {
        const fragment = code.slice(openingElement.start, openingElement.end)
        const idx = fragment.lastIndexOf('/>')
        if (idx !== -1)
          locations.push({ position: openingElement.start + idx, selfClosing: true })
      }
      else if (node.closingElement) {
        locations.push({ position: node.closingElement.start, selfClosing: false })
      }
    },
  })

  visitor.visit(result.program)

  if (locations.length === 0)
    return false

  locations.sort((a, b) => b.position - a.position)
  for (const loc of locations) {
    if (loc.selfClosing)
      s.overwrite(loc.position, loc.position + 2, '><HeadStream /></Suspense>')
    else
      s.appendLeft(loc.position, '<HeadStream />')
  }

  const importPath = `@unhead/react/${isSSR ? 'server' : 'client'}`
  const imports = findStaticImports(code)
  const existing = imports.find(i => i.specifier === importPath)

  if (existing) {
    if (!existing.imports?.includes('HeadStream')) {
      const inner = existing.imports?.replace(/^\{\s*|\s*\}\s*$/g, '').trim() || ''
      const newImports = inner ? `${inner}, HeadStream` : 'HeadStream'
      s.overwrite(existing.start, existing.end, `import { ${newImports} } from '${importPath}'\n`)
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
 * Transform for streaming mode.
 * Finds useHead/useSeoMeta calls and wraps component returns with streaming script output.
 * Runs on both SSR and client to ensure hydration match.
 */
function transformStreaming(ctx: UnheadPluginContext, parseResult: any, isSSR: boolean): boolean {
  const { code, s } = ctx

  // Find all function components that contain useHead calls
  const componentsWithHead: {
    name: string
    start: number
    end: number
    bodyStart: number
    bodyEnd: number
    returnStatements: { start: number, end: number, jsxStart: number, jsxEnd: number, isParenthesized: boolean }[]
    useHeadCalls: number
  }[] = []

  let useHeadCallCount = 0

  const visitor = new Visitor({
    CallExpression(node: any) {
      const callee = node.callee
      if (callee?.type === 'Identifier' && (callee.name === 'useHead' || callee.name === 'useSeoMeta' || callee.name === 'useHeadSafe')) {
        useHeadCallCount++
      }
    },
  })

  visitor.visit(parseResult.program)

  if (useHeadCallCount === 0)
    return false

  // Find function declarations/expressions that contain useHead and have JSX returns
  const functionVisitor = new Visitor({
    FunctionDeclaration(node: any) {
      processFunction(node, node.id?.name)
    },
    FunctionExpression(node: any) {
      // Can't reliably get name without ancestors, just process
      processFunction(node, undefined)
    },
    ArrowFunctionExpression(node: any) {
      // Can't reliably get name without ancestors, just process
      processFunction(node, undefined)
    },
  })

  function processFunction(node: any, name: string | undefined) {
    if (!node.body)
      return

    const bodyCode = code.slice(node.body.start, node.body.end)

    // Check if this function has useHead calls
    if (!bodyCode.includes('useHead') && !bodyCode.includes('useSeoMeta') && !bodyCode.includes('useHeadSafe'))
      return

    // Find return statements with JSX
    const returns: { start: number, end: number, jsxStart: number }[] = []
    let headCalls = 0

    const innerVisitor = new Visitor({
      CallExpression(innerNode: any) {
        const callee = innerNode.callee
        if (callee?.type === 'Identifier' && (callee.name === 'useHead' || callee.name === 'useSeoMeta' || callee.name === 'useHeadSafe')) {
          headCalls++
        }
      },
      ReturnStatement(innerNode: any) {
        if (innerNode.argument) {
          let arg = innerNode.argument
          // Unwrap parenthesized expressions
          if (arg.type === 'ParenthesizedExpression' && arg.expression) {
            arg = arg.expression
          }
          // Check if return contains JSX
          if (arg.type === 'JSXElement' || arg.type === 'JSXFragment') {
            returns.push({
              start: innerNode.start,
              end: innerNode.end,
              jsxStart: arg.start,
              jsxEnd: arg.end,
              isParenthesized: innerNode.argument.type === 'ParenthesizedExpression',
            })
          }
        }
      },
    })

    // For arrow functions with implicit return (no block body)
    if (node.body.type === 'JSXElement' || node.body.type === 'JSXFragment') {
      returns.push({
        start: node.body.start,
        end: node.body.end,
        jsxStart: node.body.start,
        jsxEnd: node.body.end,
        isParenthesized: false,
      })
    }
    else {
      innerVisitor.visit(node.body)
    }

    if (headCalls > 0 && returns.length > 0) {
      componentsWithHead.push({
        name: name || 'Anonymous',
        start: node.start,
        end: node.end,
        bodyStart: node.body.start,
        bodyEnd: node.body.end,
        returnStatements: returns,
        useHeadCalls: headCalls,
      })
    }
  }

  functionVisitor.visit(parseResult.program)

  if (componentsWithHead.length === 0)
    return false

  // Transform: wrap each component's returns with HeadStreamScript
  // Process in reverse order to maintain positions
  componentsWithHead.sort((a, b) => b.start - a.start)

  for (const comp of componentsWithHead) {
    // Sort returns in reverse order
    comp.returnStatements.sort((a, b) => b.start - a.start)

    for (const ret of comp.returnStatements) {
      const jsxCode = code.slice(ret.jsxStart, ret.jsxEnd)

      if (ret.isParenthesized) {
        // return (\n  <jsx>\n) - replace just the JSX part, keep parens
        s.overwrite(ret.jsxStart, ret.jsxEnd, `<><HeadStreamScript />${jsxCode}</>`)
      }
      else {
        // return <jsx> or implicit arrow return
        s.overwrite(ret.jsxStart, ret.jsxEnd, `<><HeadStreamScript />${jsxCode}</>`)
      }
    }
  }

  // Add import for HeadStreamScript (different path for SSR vs client)
  const importPath = isSSR ? '@unhead/react/server' : '@unhead/react/client'
  const imports = findStaticImports(code)
  const existingImport = imports.find(i => i.specifier === importPath)

  if (existingImport) {
    if (!existingImport.imports?.includes('HeadStreamScript')) {
      const inner = existingImport.imports?.replace(/^\{\s*|\s*\}\s*$/g, '').trim() || ''
      const newImports = inner ? `${inner}, HeadStreamScript` : 'HeadStreamScript'
      s.overwrite(existingImport.start, existingImport.end, `import { ${newImports} } from '${importPath}'\n`)
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
 * Vite plugin that injects HeadStream into React Suspense boundaries.
 * With streaming: true, transforms useHead calls to output inline scripts for SSR streaming.
 */
export function unheadReactPlugin(options: UnheadReactPluginOptions = {}): VitePlugin {
  const { streaming, ...rest } = options
  return createUnheadPlugin({
    name: 'unhead-react',
    defaultInclude: /\.[jt]sx$/,
    quickCheck: code => streaming ? code.includes('useHead') || code.includes('useSeoMeta') : code.includes('Suspense'),
    transform: ctx => transform({ ...ctx, streaming }),
  }, rest)
}

export default unheadReactPlugin
