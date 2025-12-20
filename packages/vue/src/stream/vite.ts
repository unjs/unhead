import type { StreamingPluginContext, VitePlugin } from 'unhead/stream/vite'
import { findStaticImports } from 'mlly'
import { createStreamingPlugin } from 'unhead/stream/vite'

export type { VitePlugin }

function transform(ctx: StreamingPluginContext): boolean {
  const { code, isSSR, s } = ctx

  // Find the template section
  const templateMatch = code.match(/<template[^>]*>/)
  if (!templateMatch)
    return false

  const templateStart = templateMatch.index! + templateMatch[0].length

  // Inject HeadStreamScript at the start of template content
  s.appendRight(templateStart, '<HeadStreamScript />')

  // Add import for HeadStreamScript
  const importPath = `@unhead/vue/${isSSR ? 'server' : 'client'}`
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
 * Vite plugin for Vue streaming SSR support.
 */
export function unheadVuePlugin(): VitePlugin {
  return createStreamingPlugin({
    name: 'unhead:vue',
    framework: '@unhead/vue',
    include: /\.vue$/,
    transform,
  })
}

export default unheadVuePlugin
