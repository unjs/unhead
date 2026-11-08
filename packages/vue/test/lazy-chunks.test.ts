import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'

// Builds against the dist files, as an app does, so run `pnpm build` first.
const root = fileURLToPath(new URL('./fixtures/lazy-chunks', import.meta.url))
const dist = (file: string) => fileURLToPath(new URL(`../dist/${file}`, import.meta.url))

async function eagerCode(): Promise<string> {
  const result: any = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    resolve: {
      alias: {
        '@unhead/vue/compiled': dist('compiled.mjs'),
        '@unhead/vue/lazy': dist('lazy.mjs'),
      },
    },
    build: {
      write: false,
      minify: false,
      rollupOptions: {
        input: `${root}/entry.ts`,
        external: ['vue'],
        // the boot group of a Nuxt site: every module of the initial chunks in one chunk
        output: { advancedChunks: { groups: [{ name: 'boot', tags: ['$initial'] }] } } as any,
      },
    },
  })
  const output = (Array.isArray(result) ? result : [result]).flatMap((r: any) => r.output).filter((c: any) => c.type === 'chunk')
  return output.filter((c: any) => c.isEntry || c.name === 'boot').map((c: any) => c.code).join('\n')
}

describe('lazy head chunks', () => {
  it('keeps the full runtime code out of an eager boot group', async () => {
    const eager = await eagerCode()
    expect(eager).toContain('function createLazyHead')
    expect(eager).not.toContain('function normalizeEntryToTags')
    expect(eager).not.toContain('function normalizeProps')
  })
})
