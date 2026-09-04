import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import {
  buildStreamingPluginOptions,
  createStreamingPlugin,
  VIRTUAL_CLIENT_ID,
  VIRTUAL_IIFE_ID,
} from '../../src/stream/unplugin'

// `unhead/stream/iife` is a subpath export that only resolves against a
// built `dist/`. Mocked here (as `@unhead/vue`'s vite-plugin test does) so
// `buildStart`'s `loadIifeCode()` works without a build.
vi.mock('unhead/stream/iife', () => ({
  streamingIifeCode: 'var __unhead_test_iife__={init(o={}){runtime.streamKey=o.streamKey??"__unhead__"}};__unhead_test_iife__.init();',
}))

const RESOLVED_CLIENT_ID = `\0${VIRTUAL_CLIENT_ID}`
const RESOLVED_IIFE_ID = `\0${VIRTUAL_IIFE_ID}`

function callResolve(plugin: any, id: string) {
  const hook = plugin.resolveId
  return typeof hook === 'function'
    ? hook.call({}, id, undefined, { isEntry: false })
    : hook.handler.call({}, id, undefined, { isEntry: false })
}

function callLoad(plugin: any, id: string) {
  const hook = plugin.load
  return typeof hook === 'function'
    ? hook.call({}, id)
    : hook.handler.call({}, id)
}

describe('streaming unplugin', () => {
  it('rejects inline stream keys containing closing script tags', () => {
    expect(() => buildStreamingPluginOptions({
      framework: '@unhead/test',
      mode: 'inline',
      streamKey: '</script><script>globalThis.PWNED=1</script>',
    })).toThrow(/Invalid streamKey/)
  })

  it.each(['async', 'module'] as const)('rejects invalid stream keys in %s mode', (mode) => {
    expect(() => buildStreamingPluginOptions({
      framework: '@unhead/test',
      mode,
      streamKey: 'invalid.key',
    })).toThrow(/Invalid streamKey/)
  })

  it('resolves the Vite-only IIFE virtual module in the Vite adapter', () => {
    const plugin = createStreamingPlugin.vite({
      framework: '@unhead/test',
      mode: 'async',
    }) as any

    expect(callResolve(plugin, VIRTUAL_CLIENT_ID)).toBe(RESOLVED_CLIENT_ID)
    expect(callResolve(plugin, VIRTUAL_IIFE_ID)).toBe(RESOLVED_IIFE_ID)
  })

  it.each([
    ['webpack'],
    ['rspack'],
    ['rollup'],
  ] as const)('does not resolve or load the Vite-only IIFE virtual module for %s', (framework) => {
    const plugin = createStreamingPlugin.raw({
      framework: '@unhead/test',
      mode: 'async',
    }, { framework } as any) as any

    expect(callResolve(plugin, VIRTUAL_CLIENT_ID)).toBe(RESOLVED_CLIENT_ID)
    expect(callResolve(plugin, VIRTUAL_IIFE_ID)).toBeUndefined()
    expect(callLoad(plugin, RESOLVED_IIFE_ID)).toBeUndefined()
  })
})

// vitejs/ecosystem#15: Vite is moving towards calling
// `transformIndexHtml(undefined, ctx)` at build time, with no HTML and
// likely no `ctx.bundle`, to collect the returned tags into a manifest that
// SSR frameworks (e.g. Nuxt) inject at request time.
describe('streaming unplugin transformIndexHtml manifest pass (vitejs/ecosystem#15)', () => {
  function fakeEmitFile() {
    const calls: any[] = []
    const emitFile = (asset: any) => {
      calls.push(asset)
      return `ref-${calls.length}`
    }
    return { calls, emitFile }
  }

  async function buildPlugin(options: Parameters<typeof buildStreamingPluginOptions>[0], config: any, hookThis: any) {
    const plugin = buildStreamingPluginOptions(options) as any
    plugin.vite.configResolved(config)
    await plugin.buildStart.call(hookThis)
    return plugin
  }

  it('async mode resolves a hashed emitted asset path prefixed with base, with no bundle', async () => {
    const { calls, emitFile } = fakeEmitFile()
    const hookThis = { emitFile }
    const plugin = await buildPlugin(
      { framework: '@unhead/test', mode: 'async' },
      { command: 'build', base: '/docs/', build: { assetsDir: 'static' } },
      hookThis,
    )

    expect(calls).toHaveLength(1)
    const emittedFileName = calls[0].fileName as string
    expect(emittedFileName).toMatch(/^static\/unhead-streaming\.[0-9a-f]{8}\.js$/)

    const result = plugin.vite.transformIndexHtml.handler.call(hookThis, undefined, undefined)

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
    expect(result[0].tag).toBe('script')
    expect(result[0].attrs.async).toBe(true)
    expect(result[0].attrs.src).toBe(`/docs/${emittedFileName}`)
  })

  it('async mode resolves Vite\'s relative base from the active HTML path', async () => {
    const { calls, emitFile } = fakeEmitFile()
    const hookThis = { emitFile }
    const renderBuiltUrl = vi.fn(() => undefined)
    const plugin = await buildPlugin(
      { framework: '@unhead/test', mode: 'async' },
      { command: 'build', base: './', build: { assetsDir: 'assets' }, experimental: { renderBuiltUrl } },
      hookThis,
    )
    const emittedFileName = calls[0].fileName as string

    const result = plugin.vite.transformIndexHtml.handler.call(hookThis, '<html></html>', {
      path: '/nested/index.html',
      filename: '/project/nested/index.html',
    })

    expect(renderBuiltUrl).toHaveBeenCalledWith(emittedFileName, { type: 'asset', hostId: 'nested/index.html', hostType: 'html', ssr: false })
    expect(result[0].attrs.src).toBe(`../${emittedFileName}`)
  })

  it('async mode honors a relative renderBuiltUrl result from the active HTML path', async () => {
    const { calls, emitFile } = fakeEmitFile()
    const hookThis = { emitFile }
    const plugin = await buildPlugin(
      { framework: '@unhead/test', mode: 'async' },
      {
        command: 'build',
        base: '/docs/',
        build: { assetsDir: 'assets' },
        experimental: { renderBuiltUrl: () => ({ relative: true }) },
      },
      hookThis,
    )
    const emittedFileName = calls[0].fileName as string

    const result = plugin.vite.transformIndexHtml.handler.call(hookThis, '<html></html>', {
      path: '/nested/index.html',
      filename: '/project/nested/index.html',
    })

    expect(result[0].attrs.src).toBe(`../${emittedFileName}`)
  })

  it('async mode keeps the raw asset name when a relative manifest pass has no HTML path', async () => {
    const { calls, emitFile } = fakeEmitFile()
    const hookThis = { emitFile }
    const renderBuiltUrl = vi.fn(() => 'https://cdn.example.com/streaming.js')
    const plugin = await buildPlugin(
      { framework: '@unhead/test', mode: 'async' },
      { command: 'build', base: './', build: { assetsDir: 'assets' }, experimental: { renderBuiltUrl } },
      hookThis,
    )
    const emittedFileName = calls[0].fileName as string

    const result = plugin.vite.transformIndexHtml.handler.call(hookThis, undefined, undefined)

    expect(renderBuiltUrl).not.toHaveBeenCalled()
    expect(result[0].attrs['data-unhead-asset']).toBe(emittedFileName)
  })

  it.each(['', '.', './'])('async mode emits at the output root when assetsDir is %j', async (assetsDir) => {
    const { calls, emitFile } = fakeEmitFile()
    await buildPlugin(
      { framework: '@unhead/test', mode: 'async' },
      { command: 'build', base: '/', build: { assetsDir } },
      { emitFile },
    )

    expect(calls[0].fileName).toMatch(/^unhead-streaming\.[0-9a-f]{8}\.js$/)
  })

  it('async mode uses a string returned by experimental.renderBuiltUrl as-is', async () => {
    const { calls, emitFile } = fakeEmitFile()
    const hookThis = { emitFile }
    const renderBuiltUrl = vi.fn((filename: string) => `https://cdn.example.com/${filename}`)
    const plugin = await buildPlugin(
      { framework: '@unhead/test', mode: 'async' },
      { command: 'build', base: '/', build: { assetsDir: 'assets' }, experimental: { renderBuiltUrl } },
      hookThis,
    )
    const emittedFileName = calls[0].fileName as string

    const result = plugin.vite.transformIndexHtml.handler.call(hookThis, undefined, {
      path: '/index.html',
      filename: '/project/index.html',
    })

    expect(renderBuiltUrl).toHaveBeenCalledWith(emittedFileName, { type: 'asset', hostId: 'index.html', hostType: 'html', ssr: false })
    expect(result[0].attrs.src).toBe(`https://cdn.example.com/${emittedFileName}`)
    expect(result[0].attrs['data-unhead-asset']).toBeUndefined()
  })

  it('async mode falls back when experimental.renderBuiltUrl returns an empty string', async () => {
    const { calls, emitFile } = fakeEmitFile()
    const hookThis = { emitFile }
    const renderBuiltUrl = vi.fn(() => '')
    const plugin = await buildPlugin(
      { framework: '@unhead/test', mode: 'async' },
      { command: 'build', base: '/docs/', build: { assetsDir: 'assets' }, experimental: { renderBuiltUrl } },
      hookThis,
    )
    const emittedFileName = calls[0].fileName as string

    const result = plugin.vite.transformIndexHtml.handler.call(hookThis, '<html></html>', {
      path: '/index.html',
      filename: '/project/index.html',
    })

    expect(result[0].attrs.src).toBe(`/docs/${emittedFileName}`)
  })

  it('async mode passes SSR build state to experimental.renderBuiltUrl', async () => {
    const { calls, emitFile } = fakeEmitFile()
    const hookThis = { emitFile }
    const renderBuiltUrl = vi.fn(() => undefined)
    const plugin = buildStreamingPluginOptions({ framework: '@unhead/test', mode: 'async' }) as any
    plugin.vite.apply({}, { command: 'build', isSsrBuild: true })
    plugin.vite.configResolved({
      command: 'build',
      base: '/',
      build: { assetsDir: 'assets' },
      experimental: { renderBuiltUrl },
    })
    await plugin.buildStart.call(hookThis)
    const emittedFileName = calls[0].fileName as string

    plugin.vite.transformIndexHtml.handler.call(hookThis, '<html></html>', {
      path: '/index.html',
      filename: '/project/index.html',
    })

    expect(renderBuiltUrl).toHaveBeenCalledWith(emittedFileName, { type: 'asset', hostId: 'index.html', hostType: 'html', ssr: true })
  })

  it('async mode rejects runtime renderBuiltUrl results for an HTML host', async () => {
    const { calls, emitFile } = fakeEmitFile()
    const hookThis = { emitFile }
    const renderBuiltUrl = vi.fn(() => ({ runtime: 'globalThis.__publicAssetsURL(...)' }))
    const plugin = await buildPlugin(
      { framework: '@unhead/test', mode: 'async' },
      { command: 'build', base: '/docs/', build: { assetsDir: 'static' }, experimental: { renderBuiltUrl } },
      hookThis,
    )
    const emittedFileName = calls[0].fileName as string

    expect(() => plugin.vite.transformIndexHtml.handler.call(hookThis, '<html></html>', {
      path: '/nested/index.html',
      filename: '/project/nested/index.html',
    })).toThrow(`{ runtime: "globalThis.__publicAssetsURL(...)" } is not supported for assets in html files: ${emittedFileName}`)

    expect(renderBuiltUrl).toHaveBeenCalledWith(emittedFileName, { type: 'asset', hostId: 'nested/index.html', hostType: 'html', ssr: false })
  })

  it('async mode falls back to the base-prefixed virtual module URL outside of a build', async () => {
    const plugin = await buildPlugin(
      { framework: '@unhead/test', mode: 'async' },
      { command: 'serve', base: '/app/', build: { assetsDir: 'assets' } },
      {},
    )

    const result = plugin.vite.transformIndexHtml.handler.call({}, undefined, undefined)

    expect(result[0].attrs.src).toBe(`/app/${VIRTUAL_IIFE_ID}`)
  })

  it('module mode falls back to the async descriptor and warns once during a manifest pass', async () => {
    const { calls, emitFile } = fakeEmitFile()
    const warn = vi.fn()
    const hookThis = { emitFile, warn }
    const plugin = await buildPlugin(
      { framework: '@unhead/test', mode: 'module' },
      { command: 'build', base: '/', build: { assetsDir: 'assets' } },
      hookThis,
    )

    expect(calls).toHaveLength(1)
    const emittedFileName = calls[0].fileName as string

    const result1 = plugin.vite.transformIndexHtml.handler.call(hookThis, undefined, undefined)
    expect(Array.isArray(result1)).toBe(true)
    expect(result1[0].tag).toBe('script')
    expect(result1[0].attrs.src).toBe(`/${emittedFileName}`)
    expect(result1[0].children).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('manifest pass')

    // Second manifest-pass call: the warning fires only once per plugin instance.
    const result2 = plugin.vite.transformIndexHtml.handler.call(hookThis, undefined, undefined)
    expect(result2[0].attrs.src).toBe(`/${emittedFileName}`)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('module manifest fallback hydrates a configured stream key', async () => {
    const { calls, emitFile } = fakeEmitFile()
    const hookThis = { emitFile, warn: vi.fn() }
    const plugin = await buildPlugin(
      { framework: '@unhead/test', mode: 'module', streamKey: '__custom__' },
      { command: 'build', base: '/', build: { assetsDir: 'assets' } },
      hookThis,
    )

    plugin.vite.transformIndexHtml.handler.call(hookThis, undefined, undefined)
    const runtime = {} as { streamKey?: string }
    runInNewContext(calls[0].source, { runtime })

    expect(runtime.streamKey).toBe('__custom__')
  })

  it('module mode keeps the dynamic import descriptor on a normal (non-manifest) render', async () => {
    const plugin = await buildPlugin(
      { framework: '@unhead/test', mode: 'module' },
      { command: 'build', base: '/', build: { assetsDir: 'assets' } },
      { emitFile: fakeEmitFile().emitFile, warn: vi.fn() },
    )

    const result = plugin.vite.transformIndexHtml.handler.call({}, '<html></html>', { bundle: {} })

    expect(result[0].children).toBe(`import("/${VIRTUAL_CLIENT_ID}")`)
    expect(result[0].attrs.src).toBeUndefined()
  })

  it('module mode prefixes the virtual client import with base during serve', async () => {
    const plugin = await buildPlugin(
      { framework: '@unhead/test', mode: 'module' },
      { command: 'serve', base: '/docs/', build: { assetsDir: 'assets' } },
      {},
    )

    const result = plugin.vite.transformIndexHtml.handler.call({}, '<html></html>', {})

    expect(result[0].children).toBe(`import("/docs/${VIRTUAL_CLIENT_ID}")`)
  })

  describe.each([
    ['async'],
    ['inline'],
    ['module'],
  ] as const)('mode: %s', (mode) => {
    it('never returns a string, and omits the nonce on a manifest pass (no html, no ctx)', async () => {
      const { emitFile } = fakeEmitFile()
      const hookThis = { emitFile, warn: vi.fn() }
      const plugin = await buildPlugin(
        { framework: '@unhead/test', mode, nonce: 'the-nonce' },
        { command: 'build', base: '/', build: { assetsDir: 'assets' } },
        hookThis,
      )

      const result = plugin.vite.transformIndexHtml.handler.call(hookThis, undefined, undefined)

      expect(Array.isArray(result)).toBe(true)
      for (const tag of result)
        expect(tag.attrs?.nonce).toBeUndefined()
    })

    it('stamps the nonce on a normal (non-manifest) render', async () => {
      const { emitFile } = fakeEmitFile()
      const hookThis = { emitFile, warn: vi.fn() }
      const plugin = await buildPlugin(
        { framework: '@unhead/test', mode, nonce: 'the-nonce' },
        { command: 'build', base: '/', build: { assetsDir: 'assets' } },
        hookThis,
      )

      const result = plugin.vite.transformIndexHtml.handler.call(hookThis, '<html></html>', { bundle: {} })

      expect(Array.isArray(result)).toBe(true)
      expect(result.some((tag: any) => tag.attrs?.nonce === 'the-nonce')).toBe(true)
    })
  })
})
