import MagicString from 'magic-string'
import { findStaticImports } from 'mlly'
import { createStreamingPlugin } from 'unhead/stream/vite'

/**
 * Transforms Svelte code to inject HeadStreamScript for streaming SSR support.
 *
 * @param code - The source code to transform
 * @param id - The file path/id being transformed
 * @param isSSR - Whether the code is being transformed for SSR
 * @param s - MagicString instance for code manipulation
 * @returns `true` if transformations were applied, `false` otherwise
 *
 * @example
 * ```svelte
 * // Input code:
 * <script>
 * import { useHead } from '@unhead/svelte'
 *
 * useHead({
 *   title: 'My Page'
 * })
 * </script>
 *
 * <h1>Hello World</h1>
 *
 * // Transformed output:
 * <script>
 * import { useHead } from '@unhead/svelte'
 * import { HeadStreamScript } from '@unhead/svelte/stream/server' // or /client
 *
 * useHead({
 *   title: 'My Page'
 * })
 * </script>
 *
 * {@html HeadStreamScript()}
 * <h1>Hello World</h1>
 * ```
 */
function transform(code: string, id: string, isSSR: boolean, s: MagicString): boolean {
  // Only transform files that use head composables
  if (!code.includes('useHead') && !code.includes('useSeoMeta') && !code.includes('useHeadSafe'))
    return false

  // Find the end of the script tag to inject after it (in the template)
  const scriptCloseMatch = code.match(/<\/script>/)
  if (!scriptCloseMatch)
    return false

  const templateStart = scriptCloseMatch.index! + scriptCloseMatch[0].length

  // Inject {@html HeadStreamScript()} after the script tag
  s.appendRight(templateStart, '\n{@html HeadStreamScript()}')

  // Add import for HeadStreamScript
  const importPath = `@unhead/svelte/stream/${isSSR ? 'server' : 'client'}`
  const scriptMatch = code.match(/<script[^>]*>/i)
  if (!scriptMatch)
    return true

  const scriptEnd = scriptMatch.index! + scriptMatch[0].length
  const imports = findStaticImports(code)
  const existing = imports.find(i => i.specifier === importPath)

  if (existing) {
    if (!existing.imports?.includes('HeadStreamScript')) {
      const inner = existing.imports?.replace(/^\{\s*|\s*\}\s*$/g, '').trim() || ''
      const newImports = inner ? `${inner}, HeadStreamScript` : 'HeadStreamScript'
      s.overwrite(existing.start, existing.end, `import { ${newImports} } from '${importPath}'\n`)
    }
  }
  else {
    s.appendRight(scriptEnd, `\nimport { HeadStreamScript } from '${importPath}'`)
  }

  return true
}

/**
 * Vite plugin for Svelte streaming SSR support.
 * Automatically injects HeadStreamScript into Svelte components.
 *
 * @returns Vite plugin configuration object with:
 *   - `name`: Plugin identifier
 *   - `enforce`: Plugin execution order ('pre')
 *   - `transform`: Transform hook for processing .svelte files
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { unheadSveltePlugin } from '@unhead/svelte/stream/vite'
 *
 * export default {
 *   plugins: [
 *     unheadSveltePlugin()
 *   ]
 * }
 * ```
 */
export function unheadSveltePlugin() {
  return createStreamingPlugin({
    framework: '@unhead/svelte',
    transform(code, id, opts) {
      // Only process .svelte files
      if (!/\.svelte$/.test(id))
        return null

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

export default unheadSveltePlugin
