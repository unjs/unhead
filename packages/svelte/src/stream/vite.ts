import type { StreamingPluginContext, VitePlugin } from 'unhead/stream/vite'
import { findStaticImports } from 'mlly'
import { createStreamingPlugin } from 'unhead/stream/vite'

export type { VitePlugin }

function transform(ctx: StreamingPluginContext): boolean {
  const { code, isSSR, s } = ctx

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
 */
export function unheadSveltePlugin(): VitePlugin {
  return createStreamingPlugin({
    name: 'unhead:svelte',
    framework: '@unhead/svelte',
    include: /\.svelte$/,
    transform,
  })
}

export default unheadSveltePlugin
