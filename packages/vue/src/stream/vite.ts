import type { StreamingPluginOptions } from 'unhead/stream/vite'
import MagicString from 'magic-string'
import { parseAndWalk } from 'oxc-walker'
import { createStreamingPlugin } from 'unhead/stream/vite'

/**
 * Transforms Vue SFC code to inject HeadStream components for streaming SSR support.
 *
 * @param code - The source code to transform
 * @param id - The file path/id being transformed
 * @param isSSR - Whether the code is being transformed for SSR
 * @param s - MagicString instance for code manipulation
 * @returns `true` if transformations were applied, `false` otherwise
 *
 * @example
 * ```vue
 * // Input code:
 * <script setup>
 * import { useHead } from '@unhead/vue'
 *
 * useHead({
 *   title: 'My Page'
 * })
 * </script>
 *
 * <template>
 *   <div>Hello World</div>
 * </template>
 *
 * // Transformed output:
 * <script setup>
 * import { useHead } from '@unhead/vue'
 * import { HeadStream } from '@unhead/vue/stream/server' // or /client
 *
 * useHead({
 *   title: 'My Page'
 * })
 * </script>
 *
 * <template>
 *   <HeadStream /><div>Hello World</div>
 * </template>
 * ```
 */
function transform(code: string, id: string, isSSR: boolean, s: MagicString): boolean {
  // Only transform files that use head composables
  if (!code.includes('useHead') && !code.includes('useSeoMeta') && !code.includes('useHeadSafe'))
    return false

  // Find the template section
  const templateMatch = code.match(/<template[^>]*>/)
  if (!templateMatch)
    return false

  const templateStart = templateMatch.index! + templateMatch[0].length

  // Inject HeadStream at the start of template content
  s.appendRight(templateStart, '<HeadStream />')

  // Add import for HeadStream
  const importPath = `@unhead/vue/stream/${isSSR ? 'server' : 'client'}`
  const scriptMatch = code.match(/<script[^>]*>/i)
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
 * Vite plugin for Vue streaming SSR support.
 * Automatically injects HeadStream components into Vue SFC templates.
 *
 * @returns Vite plugin configuration object with:
 *   - `name`: Plugin identifier
 *   - `enforce`: Plugin execution order ('pre')
 *   - `transform`: Transform hook for processing .vue files
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { unheadVuePlugin } from '@unhead/vue/stream/vite'
 *
 * export default {
 *   plugins: [
 *     unheadVuePlugin()
 *   ]
 * }
 * ```
 */
export function unheadVuePlugin(options?: Pick<StreamingPluginOptions, 'mode'>) {
  return createStreamingPlugin({
    framework: '@unhead/vue',
    filter: /\.vue$/,
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
