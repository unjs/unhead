import type { StreamingPluginOptions } from 'unhead/stream/vite'
import MagicString from 'magic-string'
import { parseAndWalk } from 'oxc-walker'
import { createStreamingPlugin } from 'unhead/stream/vite'

const TEMPLATE_RE = /<template[^>]*>/
const SCRIPT_RE = /<script[^>]*>/i
const FILTER_RE = /\.vue$/

/**
 * Transforms Vue SFC code to inject `<HeadStream />` components for streaming
 * SSR support. One is added as the first child of each SFC `<template>` that
 * uses `useHead` / `useSeoMeta` / `useHeadSafe`; an import is inserted into
 * `<script>`.
 *
 * On the server `HeadStream` emits a `<script data-allow-mismatch="children">`
 * containing the pending head-update JS; on the client it emits an identical
 * empty `<script>`. Symmetric vnode types + `data-allow-mismatch` make Vue's
 * hydrator silently tolerate the inner-content difference.
 */
function transform(code: string, id: string, isSSR: boolean, s: MagicString): boolean {
  if (!code.includes('useHead') && !code.includes('useSeoMeta') && !code.includes('useHeadSafe'))
    return false

  const templateMatch = code.match(TEMPLATE_RE)
  if (!templateMatch)
    return false

  const templateStart = templateMatch.index! + templateMatch[0].length

  s.appendRight(templateStart, '<HeadStream />')

  const importPath = `@unhead/vue/stream/${isSSR ? 'server' : 'client'}`
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
      s.overwrite(foundImport.start, foundImport.end, `import { ${newImports} } from '${importPath}'\n`)
    }
  }
  else {
    s.appendRight(scriptEnd, `\nimport { HeadStream } from '${importPath}'`)
  }

  return true
}

/**
 * Vite plugin for Vue streaming SSR support. Automatically injects
 * `<HeadStream />` into Vue SFC templates for components that use head
 * composables.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { unheadVuePlugin } from '@unhead/vue/stream/vite'
 *
 * export default {
 *   plugins: [
 *     unheadVuePlugin(),
 *   ],
 * }
 * ```
 */
export function unheadVuePlugin(options?: Pick<StreamingPluginOptions, 'mode'>) {
  return createStreamingPlugin({
    framework: '@unhead/vue',
    filter: FILTER_RE,
    mode: options?.mode,
    transform(code, id, opts) {
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

export default unheadVuePlugin
