import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { transformInlineScriptWithVite } from '../src/unplugin/MinifyTransform'
import { Unhead } from '../src/unplugin/vite'

const fixtureDir = fileURLToPath(new URL('./fixtures/vite-build', import.meta.url))
const entry = fileURLToPath(new URL('./fixtures/vite-build/entry.ts', import.meta.url))
const mtsEntry = fileURLToPath(new URL('./fixtures/vite-build/entry.mts', import.meta.url))
const dataBlockEntry = fileURLToPath(new URL('./fixtures/vite-build/data-block.ts', import.meta.url))
const fullRuntimeEntry = fileURLToPath(new URL('./fixtures/vite-build/full-runtime.ts', import.meta.url))
const compiledRuntimeEntry = fileURLToPath(new URL('./fixtures/vite-build/compiled-runtime.ts', import.meta.url))
const quotedPropertiesEntry = fileURLToPath(new URL('./fixtures/vite-build/quoted-properties.ts', import.meta.url))

function outputCode(result: any): string {
  const outputs = Array.isArray(result) ? result : [result]
  return outputs
    .flatMap((o: any) => o.output ?? [])
    .filter((chunk: any) => chunk.type === 'chunk')
    .map((chunk: any) => chunk.code)
    .join('\n')
}

// Builds a runtime chunk of the lazy head as a minified library, with the chunks it imports.
async function buildRuntime(compile: boolean | { debug?: boolean }, runtimeEntry: string): Promise<string> {
  const result = await build({
    root: fixtureDir,
    configFile: false,
    logLevel: 'silent',
    plugins: Unhead({ devtools: false, validate: false, compile, _framework: '@unhead/vue' }) as any,
    build: {
      write: false,
      minify: true,
      lib: { entry: runtimeEntry, formats: ['es'], fileName: 'runtime' },
    },
  })
  return outputCode(result)
}

// Builds the full runtime of the lazy head and loads it.
async function buildFullRuntime(compile: boolean | { debug?: boolean }) {
  const code = await buildRuntime(compile, fullRuntimeEntry)
  const file = join(await mkdtemp(join(tmpdir(), 'unhead-full-runtime-')), 'full-runtime.mjs')
  await writeFile(file, code)
  const { upgradeHead } = await import(pathToFileURL(file).href)
  return { code, upgradeHead }
}

describe('compile debug', () => {
  // an entry without compiled tags loads the full runtime
  const loose = { input: { title: 'Loose' } }
  const lazyHead = () => ({ entries: new Map<number, { input: unknown }>([[1, { input: [] }], [2, loose]]), resolvedOptions: {}, plugins: new Map() }) as any

  it('sets _fullRuntimeReason to the first entry without compiled tags', async () => {
    const { upgradeHead } = await buildFullRuntime({ debug: true })
    const head = lazyHead()
    await upgradeHead(head, {}, () => [])
    expect(head._fullRuntimeReason).toEqual({ _tag: 'Entry', entry: loose })
  })

  it.each([true, { debug: false }])('drops the debug code with compile: %j', async (compile) => {
    const { code, upgradeHead } = await buildFullRuntime(compile)
    expect(code).not.toContain('_fullRuntimeReason')
    expect(code).not.toContain('__UNHEAD_COMPILE_DEBUG__')
    const head = lazyHead()
    await upgradeHead(head, {}, () => [])
    expect(head._fullRuntimeReason).toBeUndefined()
  })

  it.each([[true, false], [{ debug: true }, true]])('keeps the compiled runtime debug code only with debug, compile: %j', async (compile, kept) => {
    const code = await buildRuntime(compile, compiledRuntimeEntry)
    expect(code.includes('_fullRuntimeReason')).toBe(kept)
    expect(code).not.toContain('__UNHEAD_COMPILE_DEBUG__')
  })

  it('runs without the constant when compile is off', async () => {
    const { code, upgradeHead } = await buildFullRuntime(false)
    expect(code).toContain('__UNHEAD_COMPILE_DEBUG__')
    const head = lazyHead()
    await upgradeHead(head, {}, () => [])
    expect(head._fullRuntimeReason).toBeUndefined()
  })
})

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

  it('normalizes an explicit Vite special target', async () => {
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({
        devtools: false,
        transformInlineScripts: { target: 'baseline-widely-available' },
      }) as any,
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
    const code = outputCode(result)

    expect(code).toContain('<div>{{ value }}</div>')
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
      build: {
        target: build.target === 'modules' ? modulesTarget : build.target,
      },
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

describe('compile with a head that vite-ssg creates', () => {
  it('turns compile off for the build and warns once, naming the file', async () => {
    const root = fileURLToPath(new URL('./fixtures/vite-ssg', import.meta.url))
    const warnings: string[] = []
    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({ devtools: false, validate: false, compile: true, _framework: '@unhead/vue' }) as any,
      build: {
        write: false,
        minify: false,
        lib: { entry: `${root}/page.ts`, formats: ['es'], fileName: 'page' },
        rollupOptions: {
          external: [/^@unhead\/vue/],
          onwarn: warning => warnings.push(warning.message),
        },
      },
    })
    const code = outputCode(result)
    expect(code).toContain('PAGE_MARKER')
    expect(code).not.toContain('useCompiledHead')
    const compileWarnings = warnings.filter(message => message.includes('Compiler mode is off'))
    expect(compileWarnings).toEqual([expect.stringContaining(`${root}/package.json`)])
    expect(compileWarnings[0]).toContain('vite-ssg')
  })
})
