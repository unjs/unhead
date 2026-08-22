import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { transformInlineScriptWithVite } from '../src/unplugin/MinifyTransform'
import { Unhead } from '../src/unplugin/vite'

const fixtureDir = fileURLToPath(new URL('./fixtures/vite-build', import.meta.url))
const entry = fileURLToPath(new URL('./fixtures/vite-build/entry.ts', import.meta.url))
const mtsEntry = fileURLToPath(new URL('./fixtures/vite-build/entry.mts', import.meta.url))
const precompiledClientEntry = fileURLToPath(new URL('./fixtures/vite-build/precompiled-client.ts', import.meta.url))
const dataBlockEntry = fileURLToPath(new URL('./fixtures/vite-build/data-block.ts', import.meta.url))
const quotedPropertiesEntry = fileURLToPath(new URL('./fixtures/vite-build/quoted-properties.ts', import.meta.url))

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

  it('client build drops server-only composables from a .mts entry', async () => {
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({ devtools: false }) as any,
      build: {
        write: false,
        minify: false,
        lib: { entry: mtsEntry, formats: ['es'], fileName: 'entry-mts' },
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

  it('does not change an ordinary SSR graph when sealed precompile is enabled', async () => {
    const compile = async (precompile: boolean) => outputCode(await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({
        devtools: false,
        validate: false,
        experimental: { precompile },
      }) as any,
      build: {
        write: false,
        minify: false,
        ssr: entry,
      },
    }))
    const [disabled, enabled] = await Promise.all([compile(false), compile(true)])
    expect(enabled).toBe(disabled)
    expect(enabled).not.toContain('._p.push(')
  })

  it('builds the sealed client entry without the dynamic normalizer', async () => {
    const code = outputCode(await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({
        devtools: false,
        validate: false,
        experimental: { precompile: true },
      }) as any,
      build: {
        write: false,
        minify: false,
        lib: { entry: precompiledClientEntry, formats: ['es'], fileName: 'precompiled-client' },
      },
    }))
    expect(code).toContain('CLIENT_PRECOMPILE_MARKER')
    expect(code).toContain('createHead().push([[')
    expect(code).not.toContain('function useHead')
    expect(code).not.toContain('__proto__')
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
      plugins: Unhead({ devtools: false, transformInlineScripts: { target: 'chrome77' } }) as any,
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

  it('normalizes an explicit Vite special target', async () => {
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({ devtools: false, transformInlineScripts: { target: 'baseline-widely-available' } }) as any,
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

  it('leaves non-JavaScript data blocks unchanged', async () => {
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({ devtools: false }) as any,
      build: {
        target: 'chrome77',
        write: false,
        minify: false,
        lib: { entry: dataBlockEntry, formats: ['es'], fileName: 'data-block' },
      },
    })
    expect(outputCode(result)).toContain('<div>{{ value }}</div>')
  })

  it('transforms quoted static property names', async () => {
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({ devtools: false }) as any,
      build: {
        target: 'chrome77',
        write: false,
        minify: false,
        lib: { entry: quotedPropertiesEntry, formats: ['es'], fileName: 'quoted-properties' },
      },
    })
    const code = outputCode(result)
    expect(code).toContain('QUOTED_MARKER')
    expect(code).not.toContain('payload?.value')
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

  it('uses Vite 6 module targets when baseline is not supported', async () => {
    const modulesTarget = ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14']
    const resolveConfig = vi.fn(async ({ build }: any) => ({
      build: { target: build.target === 'modules' ? modulesTarget : build.target },
    }))
    const transformWithEsbuild = vi.fn(async () => ({ code: '  esbuild output  ' }))

    await transformInlineScriptWithVite({ resolveConfig, transformWithEsbuild } as any, 'source', 'baseline-widely-available')

    expect(resolveConfig).toHaveBeenNthCalledWith(1, {
      configFile: false,
      build: { target: 'baseline-widely-available' },
    }, 'build')
    expect(resolveConfig).toHaveBeenNthCalledWith(2, {
      configFile: false,
      build: { target: 'modules' },
    }, 'build')
    expect(transformWithEsbuild).toHaveBeenCalledWith('source', 'unhead-inline-script.js', {
      loader: 'js',
      target: modulesTarget,
    })
  })
})
