import type { StreamingPluginOptions } from 'unhead/stream/unplugin'
import MagicString from 'magic-string'
import { parseAndWalk } from 'oxc-walker'
import { buildStreamingPluginOptions } from 'unhead/stream/unplugin'
import { createUnplugin } from 'unplugin'

const SCRIPT_CLOSE_RE = /<\/script>/
const SCRIPT_RE = /<script[^>]*>/i
const FILTER_RE = /\.svelte$/

function transform(code: string, id: string, isSSR: boolean, s: MagicString): boolean {
  if (!code.includes('useHead') && !code.includes('useSeoMeta') && !code.includes('useHeadSafe'))
    return false

  const scriptCloseMatch = code.match(SCRIPT_CLOSE_RE)
  if (!scriptCloseMatch)
    return false

  const templateStart = scriptCloseMatch.index! + scriptCloseMatch[0].length

  s.appendRight(templateStart, '\n{@html HeadStream()}')

  const importPath = `@unhead/svelte/stream/${isSSR ? 'server' : 'client'}`
  const scriptMatch = code.match(SCRIPT_RE)
  if (!scriptMatch)
    return true

  const scriptEnd = scriptMatch.index! + scriptMatch[0].length
  const scriptCloseIndex = code.indexOf('</script>', scriptEnd)
  if (scriptCloseIndex === -1)
    return true

  const scriptContent = code.slice(scriptEnd, scriptCloseIndex)

  let existingImport: { start: number, end: number, specifiers: string[] } | null = null
  parseAndWalk(scriptContent, id, {
    parseOptions: { lang: 'ts' },
    enter(node: any) {
      if (node.type === 'ImportDeclaration' && node.source.value === importPath) {
        existingImport = {
          start: scriptEnd + node.start,
          end: scriptEnd + node.end,
          specifiers: node.specifiers?.map((spec: any) => spec.local?.name).filter(Boolean) || [],
        }
        this.skip()
      }
    },
  })

  const foundImport = existingImport as { start: number, end: number, specifiers: string[] } | null
  if (foundImport) {
    if (!foundImport.specifiers.includes('HeadStream')) {
      const inner = foundImport.specifiers.join(', ')
      const newImports = inner ? `${inner}, HeadStream` : 'HeadStream'
      s.overwrite(foundImport.start, foundImport.end, `import { ${newImports} } from '${importPath}'`)
    }
  }
  else {
    s.appendRight(scriptEnd, `\nimport { HeadStream } from '${importPath}'`)
  }

  return true
}

export type UnheadSvelteStreamingOptions = Pick<StreamingPluginOptions, 'mode'>

export const unheadSvelteStreamingPlugin = createUnplugin<UnheadSvelteStreamingOptions | undefined>((options = {}) =>
  buildStreamingPluginOptions({
    framework: '@unhead/svelte',
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
