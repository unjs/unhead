import type { UnheadPluginContext, UnheadPluginOptions, VitePlugin } from 'unhead/vite-plugin'
import { findStaticImports } from 'mlly'
import { createUnheadPlugin } from 'unhead/vite-plugin'

export interface UnheadVuePluginOptions extends UnheadPluginOptions {
  /**
   * @default /\.vue$/
   */
  include?: RegExp
}

function transform(ctx: UnheadPluginContext): boolean {
  const { code, isSSR, s, onlyWithUseHead } = ctx

  if (onlyWithUseHead && !code.includes('useHead'))
    return false

  const locations: number[] = []
  const regex = /<Suspense(?:\s[^>]*)?>/g

  const starts: number[] = []
  for (const match of code.matchAll(regex))
    starts.push(match.index!)

  for (const startPos of starts) {
    let depth = 1
    let searchPos = startPos + 10

    while (depth > 0 && searchPos < code.length) {
      const nextStart = code.indexOf('<Suspense', searchPos)
      const nextEnd = code.indexOf('</Suspense>', searchPos)

      if (nextEnd === -1)
        break

      if (nextStart !== -1 && nextStart < nextEnd) {
        depth++
        searchPos = nextStart + 10
      }
      else {
        depth--
        if (depth === 0)
          locations.push(nextEnd)
        searchPos = nextEnd + 11
      }
    }
  }

  if (locations.length === 0)
    return false

  locations.sort((a, b) => b - a)
  for (const pos of locations)
    s.appendLeft(pos, '<HeadStream />')

  const importPath = `@unhead/vue/${isSSR ? 'server' : 'client'}`
  const scriptMatch = code.match(/<script[^>]*>/)
  if (!scriptMatch)
    return true

  const scriptEnd = scriptMatch.index! + scriptMatch[0].length
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
    s.appendRight(scriptEnd, `\nimport { HeadStream } from '${importPath}'`)
  }

  return true
}

/**
 * Vite plugin that injects HeadStream into Vue Suspense boundaries.
 */
export function unheadVuePlugin(options: UnheadVuePluginOptions = {}): VitePlugin {
  return createUnheadPlugin({
    name: 'unhead-vue',
    defaultInclude: /\.vue$/,
    quickCheck: code => code.includes('<Suspense'),
    transform,
  }, options)
}

export default unheadVuePlugin
