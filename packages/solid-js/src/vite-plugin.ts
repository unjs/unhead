import type { UnheadPluginContext, UnheadPluginOptions, VitePlugin } from 'unhead/vite-plugin'
import { findStaticImports } from 'mlly'
import { parseSync, Visitor } from 'oxc-parser'
import { createUnheadPlugin } from 'unhead/vite-plugin'

export interface UnheadSolidPluginOptions extends UnheadPluginOptions {
  /**
   * @default /\.[jt]sx$/
   */
  include?: RegExp
}

function transform(ctx: UnheadPluginContext): boolean {
  const { code, id, isSSR, s, onlyWithUseHead } = ctx

  if (onlyWithUseHead && !code.includes('useHead'))
    return false

  const lang = id.endsWith('.tsx') ? 'tsx' : id.endsWith('.jsx') ? 'jsx' : 'tsx'
  const result = parseSync(id, code, { lang })

  if (result.errors.length > 0)
    return false

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

  const importPath = `@unhead/solid-js/${isSSR ? 'server' : 'client'}`
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
 * Vite plugin that injects HeadStream into Solid Suspense boundaries.
 */
export function unheadSolidPlugin(options: UnheadSolidPluginOptions = {}): VitePlugin {
  return createUnheadPlugin({
    name: 'unhead-solid',
    defaultInclude: /\.[jt]sx$/,
    quickCheck: code => code.includes('Suspense'),
    transform,
  }, options)
}

export default unheadSolidPlugin
