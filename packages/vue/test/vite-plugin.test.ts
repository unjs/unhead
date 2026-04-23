import { describe, expect, it } from 'vitest'
import { unheadVueStreamingPlugin } from '../src/stream/plugin'

describe('unheadVueStreamingPlugin', () => {
  const plugin = unheadVueStreamingPlugin.vite() as any

  describe('basic configuration', () => {
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
