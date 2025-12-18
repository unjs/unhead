import type { UnheadPluginContext, UnheadPluginOptions, VitePlugin } from 'unhead/vite-plugin'
import { findStaticImports } from 'mlly'
import { createUnheadPlugin } from 'unhead/vite-plugin'

export interface UnheadSveltePluginOptions extends UnheadPluginOptions {
  /**
   * @default /\.svelte$/
   */
  include?: RegExp
}

function transform(ctx: UnheadPluginContext): boolean {
  const { code, isSSR, s, onlyWithUseHead } = ctx

  if (onlyWithUseHead && !code.includes('useHead'))
    return false

  const locations: number[] = []
  const regex = /\{#await\b/g

  const starts: number[] = []
  for (const match of code.matchAll(regex))
    starts.push(match.index!)

  for (const startPos of starts) {
    let depth = 1
    let searchPos = startPos + 7

    while (depth > 0 && searchPos < code.length) {
      const nextStart = code.indexOf('{#await', searchPos)
      const nextEnd = code.indexOf('{/await}', searchPos)

      if (nextEnd === -1)
        break

      if (nextStart !== -1 && nextStart < nextEnd) {
        depth++
        searchPos = nextStart + 7
      }
      else {
        depth--
        if (depth === 0) {
          const block = code.slice(startPos, nextEnd)
          if (block.includes('{:then'))
            locations.push(nextEnd)
        }
        searchPos = nextEnd + 8
      }
    }
  }

  if (locations.length === 0)
    return false

  locations.sort((a, b) => b - a)
  for (const pos of locations)
    s.appendLeft(pos, '{@html HeadStream()}')

  const importPath = `@unhead/svelte/${isSSR ? 'server' : 'client'}`
  const scriptMatch = code.match(/<script[^>]*>/i)
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
 * Vite plugin that injects HeadStream into Svelte {#await} blocks.
 */
export function unheadSveltePlugin(options: UnheadSveltePluginOptions = {}): VitePlugin {
  return createUnheadPlugin({
    name: 'unhead-svelte',
    defaultInclude: /\.svelte$/,
    quickCheck: code => code.includes('{#await'),
    transform,
  }, options)
}

export default unheadSveltePlugin
