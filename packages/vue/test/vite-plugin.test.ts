import { describe, expect, it } from 'vitest'
import { unheadVuePlugin } from '../src/stream/vite'

describe('unheadVuePlugin', () => {
  const plugin = unheadVuePlugin() as any

  describe('basic configuration', () => {
    it('has correct name', () => {
      expect(plugin.name).toBe('@unhead/vue:streaming')
    })

    it('enforces pre order', () => {
      expect(plugin.enforce).toBe('pre')
    })

    // No SFC source transform runs: per-chunk head patches are emitted by
    // wrapStream on the server. The transform hook is still registered by
    // the core factory, but with a never-matching filter.
    it('registers a never-matching transform filter', () => {
      expect(plugin.transform.filter.id.test('any.vue')).toBe(false)
    })
  })

  describe('virtual modules', () => {
    it('resolves the iife virtual id', () => {
      const resolved = plugin.resolveId.handler('virtual:@unhead/streaming-iife.js')
      expect(resolved).toBe('\0virtual:@unhead/streaming-iife.js')
    })

    it('resolves the client virtual id', () => {
      const resolved = plugin.resolveId.handler('virtual:@unhead/streaming-client')
      expect(resolved).toBe('\0virtual:@unhead/streaming-client')
    })
  })

  describe('transformIndexHtml', () => {
    it('injects the iife script tag for async mode', () => {
      const tags = plugin.transformIndexHtml()
      expect(Array.isArray(tags)).toBe(true)
      expect(tags[0].tag).toBe('script')
      expect(tags[0].injectTo).toBe('head-prepend')
      expect(tags[0].attrs).toMatchObject({ async: true })
      expect(tags[0].attrs.src).toContain('virtual:@unhead/streaming-iife.js')
    })
  })
})
