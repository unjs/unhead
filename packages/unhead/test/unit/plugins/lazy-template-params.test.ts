import { fileURLToPath } from 'node:url'
import { rollup } from 'rollup'
import { describe, expect, it } from 'vitest'

// Bundles the dist files, as an app does, so run `pnpm build` first.
const plugins = fileURLToPath(new URL('../../../dist/plugins.mjs', import.meta.url))
const ENTRY = '\0entry'
const PURE_RE = /\/\* @__PURE__ \*\//g

// The `lazyPlugins` loader of a lazy head, bundled after a per-module minify step that
// drops `@__PURE__` annotations, so each module is shaken by its structure only
async function lazyChunk(): Promise<string> {
  const bundle = await rollup({
    input: ENTRY,
    treeshake: { moduleSideEffects: false },
    plugins: [{
      name: 'lazy-template-params',
      resolveId: id => id === ENTRY ? id : undefined,
      load: id => id === ENTRY ? `export const lazyPlugins = () => import(${JSON.stringify(plugins)}).then(m => [m.TemplateParamsPlugin])` : undefined,
      transform: code => code.replace(PURE_RE, ''),
    }],
  })
  const { output } = await bundle.generate({ format: 'es' })
  await bundle.close()
  return output.filter(chunk => chunk.type === 'chunk' && !chunk.isEntry).map(chunk => (chunk as { code: string }).code).join('\n')
}

describe('lazy template params', () => {
  it('loads TemplateParamsPlugin without the other plugins', async () => {
    const code = await lazyChunk()
    expect(code).toContain('template-params')
    expect(code).not.toContain('aliasSorting')
    expect(code).not.toContain('deprecations')
    expect(code).not.toContain('promises')
  })
})
