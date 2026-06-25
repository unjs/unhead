import { describe, expect, it, vi } from 'vitest'
import { unheadVueStreamingPlugin } from '../src/stream/plugin'
import { unheadVuePlugin } from '../src/stream/vite'

vi.mock('unhead/stream/iife', () => ({
  streamingIifeCode: 'window.__unhead_test_iife__=true;',
}))

describe('unheadVueStreamingPlugin', () => {
  const plugin = unheadVueStreamingPlugin.vite() as any

  describe('vite adapter', () => {
    it('has correct name', () => {
      expect(plugin.name).toBe('@unhead/vue:streaming')
    })

    it('enforces pre order', () => {
      expect(plugin.enforce).toBe('pre')
    })

    // Vue does not register a source transform: per-chunk head patches are
    // emitted by wrapStream on the server. No filter/transform hook present.
    it('does not register a transform hook', () => {
      expect(plugin.transform).toBeUndefined()
    })

    it('resolves the iife virtual id', () => {
      const vitePlugin = unheadVueStreamingPlugin.vite() as any
      vitePlugin.apply({}, { command: 'serve', mode: 'development', isSsrBuild: false })
      const resolved = vitePlugin.resolveId.handler('virtual:@unhead/streaming-iife.js')
      expect(resolved).toBe('\0virtual:@unhead/streaming-iife.js')
    })

    it('resolves the client virtual id', () => {
      const resolved = plugin.resolveId.handler('virtual:@unhead/streaming-client')
      expect(resolved).toBe('\0virtual:@unhead/streaming-client')
    })

    it('injects the iife script tag for async mode with order: pre', () => {
      // `order: 'pre'` is required so our virtual-module script src is
      // injected before other HTML transforms run against it.
      expect(plugin.transformIndexHtml.order).toBe('pre')
      const tags = plugin.transformIndexHtml.handler()
      expect(Array.isArray(tags)).toBe(true)
      expect(tags[0].tag).toBe('script')
      expect(tags[0].injectTo).toBe('head-prepend')
      expect(tags[0].attrs).toMatchObject({ async: true })
      expect(tags[0].attrs.src).toContain('virtual:@unhead/streaming-iife.js')
    })

    it('injects the emitted iife asset path for async production builds', async () => {
      const buildPlugin = unheadVueStreamingPlugin.vite() as any
      buildPlugin.apply({}, { command: 'build', mode: 'production', isSsrBuild: false })
      buildPlugin.configResolved({ command: 'build' })

      const emittedRef = 'asset-ref-1'
      let emittedAsset: any
      await buildPlugin.buildStart.call({
        emitFile(asset: any) {
          emittedAsset = asset
          return emittedRef
        },
      })

      const fileName = 'assets/unhead-streaming.abc123.js'
      const bundle = {
        [fileName]: {
          type: 'asset',
          name: 'unhead-streaming.js',
          names: ['unhead-streaming.js'],
          fileName,
          source: emittedAsset.source,
        },
      }

      const tags = buildPlugin.transformIndexHtml.handler.call({
        getFileName() {
          return emittedRef
        },
      }, '<html></html>', { bundle })

      const src = tags[0].attrs.src
      expect(src).toBe(`/${fileName}`)
      expect(src).not.toContain(emittedRef)
      expect(bundle[src.slice(1) as keyof typeof bundle]).toBeDefined()
    })
  })

  describe('webpack adapter', () => {
    const wp = unheadVueStreamingPlugin.webpack() as any

    it('exposes a webpack plugin instance with apply()', () => {
      expect(typeof wp.apply).toBe('function')
    })
  })

  describe('rspack adapter', () => {
    const rs = unheadVueStreamingPlugin.rspack() as any

    it('exposes an rspack plugin instance with apply()', () => {
      expect(typeof rs.apply).toBe('function')
    })
  })

  describe('rollup adapter', () => {
    const rl = unheadVueStreamingPlugin.rollup() as any

    it('has correct name', () => {
      expect(rl.name).toBe('@unhead/vue:streaming')
    })

    it('does not resolve the vite-only iife virtual id', () => {
      // rollup normalises plugin hooks to `{ handler }` shape
      const resolved = typeof rl.resolveId === 'function'
        ? rl.resolveId('virtual:@unhead/streaming-iife.js')
        : rl.resolveId.handler('virtual:@unhead/streaming-iife.js')
      expect(resolved).toBeUndefined()
    })
  })
})

describe('deprecated unheadVuePlugin', () => {
  it('returns a vite plugin (back-compat alias for unheadVueStreamingPlugin.vite)', () => {
    const plugin = unheadVuePlugin() as any
    expect(plugin.name).toBe('@unhead/vue:streaming')
    expect(plugin.enforce).toBe('pre')
  })
})
