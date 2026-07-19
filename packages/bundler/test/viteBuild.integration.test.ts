import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { transformInlineScriptWithVite } from '../src/unplugin/MinifyTransform'
import { Unhead } from '../src/unplugin/vite'

const fixtureDir = fileURLToPath(new URL('./fixtures/vite-build', import.meta.url))
const entry = fileURLToPath(new URL('./fixtures/vite-build/entry.ts', import.meta.url))

function outputCode(result: any): string {
  const outputs = Array.isArray(result) ? result : [result]
  return outputs
    .flatMap((o: any) => o.output ?? [])
    .filter((chunk: any) => chunk.type === 'chunk')
    .map((chunk: any) => chunk.code)
    .join('\n')
}

describe('vite build integration', () => {
  it('client build drops server-only composables', async () => {
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({ devtools: false }) as any,
      build: {
        write: false,
        minify: false,
        lib: { entry, formats: ['es'], fileName: 'entry' },
      },
    })
    const code = outputCode(result)
    expect(code).toContain('CLIENT_MARKER')
    expect(code).not.toContain('SERVER_ONLY_MARKER')
  })

  it('ssr build retains server-only composables', async () => {
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({ devtools: false }) as any,
      build: {
        write: false,
        minify: false,
        ssr: entry,
      },
    })
    const code = outputCode(result)
    expect(code).toContain('SERVER_ONLY_MARKER')
    expect(code).toContain('CLIENT_MARKER')
  })

  it('transpiles inline scripts to the resolved Vite build target', async () => {
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({ devtools: false }) as any,
      build: {
        target: 'chrome77',
        write: false,
        minify: false,
        lib: { entry, formats: ['es'], fileName: 'entry' },
      },
    })
    const code = outputCode(result)

    expect(code).toContain('INLINE_MARKER')
    expect(code).not.toContain('payload?.value')
    expect(code).not.toContain('?? "fallback"')
  })

  it('allows inline script transpilation to opt out', async () => {
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({ devtools: false, transformInlineScripts: false }) as any,
      build: {
        target: 'chrome77',
        write: false,
        minify: false,
        lib: { entry, formats: ['es'], fileName: 'entry' },
      },
    })
    const code = outputCode(result)

    expect(code).toContain('payload?.value')
    expect(code).toContain('??')
  })

  it('lets an explicit inline script target override Vite', async () => {
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({
        devtools: false,
        transformInlineScripts: { target: 'chrome77' },
      }) as any,
      build: {
        target: 'es2020',
        write: false,
        minify: false,
        lib: { entry, formats: ['es'], fileName: 'entry' },
      },
    })
    const code = outputCode(result)

    expect(code).not.toContain('payload?.value')
    expect(code).not.toContain('?? "fallback"')
  })
})

describe('vite inline script transform backend', () => {
  it('uses Oxc when Vite exposes it', async () => {
    const transformWithOxc = vi.fn(async () => ({ code: '  oxc output  ' }))
    const transformWithEsbuild = vi.fn(async () => ({ code: 'esbuild output' }))

    const result = await transformInlineScriptWithVite({ transformWithOxc, transformWithEsbuild } as any, 'source', 'chrome77')

    expect(result).toBe('oxc output')
    expect(transformWithOxc).toHaveBeenCalledWith('source', 'unhead-inline-script.js', {
      lang: 'js',
      sourcemap: false,
      target: 'chrome77',
    })
    expect(transformWithEsbuild).not.toHaveBeenCalled()
  })

  it('falls back to esbuild for Vite 6 and 7', async () => {
    const transformWithEsbuild = vi.fn(async () => ({ code: '  esbuild output  ' }))

    const result = await transformInlineScriptWithVite({ transformWithEsbuild } as any, 'source', 'chrome77')

    expect(result).toBe('esbuild output')
    expect(transformWithEsbuild).toHaveBeenCalledWith('source', 'unhead-inline-script.js', {
      loader: 'js',
      target: 'chrome77',
    })
  })
})
