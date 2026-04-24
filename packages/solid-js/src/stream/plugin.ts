import type { StreamingPluginOptions } from 'unhead/stream/unplugin'
import MagicString from 'magic-string'
import { parseAndWalk } from 'oxc-walker'
import { buildStreamingPluginOptions } from 'unhead/stream/unplugin'
import { createUnplugin } from 'unplugin'

const FILTER_RE = /\.[jt]sx$/

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

  returns.sort((a, b) => b.jsxStart - a.jsxStart)
  for (const ret of returns) {
    const jsxCode = code.slice(ret.jsxStart, ret.jsxEnd)
    s.overwrite(ret.jsxStart, ret.jsxEnd, `<><HeadStream />${jsxCode}</>`)
  }

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

export type UnheadSolidStreamingOptions = Pick<StreamingPluginOptions, 'mode'>

export const unheadSolidStreamingPlugin = createUnplugin<UnheadSolidStreamingOptions | undefined>((options = {}) =>
  buildStreamingPluginOptions({
    framework: '@unhead/solid-js',
    filter: FILTER_RE,
    mode: options.mode,
    transform(code, id, opts) {
      const s = new MagicString(code)
      if (!transform(code, id, opts?.ssr ?? false, s))
        return null
      return {
        code: s.toString(),
        map: s.generateMap({ includeContent: true, source: id }),
      }
    },
  }),
)
