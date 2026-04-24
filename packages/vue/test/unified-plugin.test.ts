import { describe, expect, it } from 'vitest'
import { Unhead } from '../src/bundler'

const STREAMING_NAME = '@unhead/vue:streaming'

describe('unified Unhead({ streaming: true }) per bundler', () => {
  it('vite returns a plugin array including the streaming plugin', () => {
    const plugins = Unhead({ streaming: true }).vite() as any[]
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.some(p => p?.name === STREAMING_NAME)).toBe(true)
  })

  it('vite omits the streaming plugin when not enabled', () => {
    const plugins = Unhead().vite() as any[]
    expect(plugins.some(p => p?.name === STREAMING_NAME)).toBe(false)
  })

  it('vite puts streaming after the build transforms it depends on', () => {
    // Streaming must come AFTER SSRStaticReplace / CreateHeadTransform so the
    // virtual module load hook sees the finalised build output. Regression
    // guard: if this inverts, `window.__unhead__` bootstrap can collide with
    // the runtime plugin initialisation that CreateHeadTransform emits.
    const plugins = Unhead({ streaming: true }).vite() as any[]
    const streamIdx = plugins.findIndex(p => p?.name === STREAMING_NAME)
    expect(streamIdx).toBeGreaterThan(0)
    expect(streamIdx).toBe(plugins.length - 1)
  })

  it('webpack adds exactly one extra plugin when streaming is enabled', () => {
    // Webpack plugin wrappers from unplugin only expose `.apply`, no `name`,
    // so we verify the streaming plugin's presence indirectly via the count
    // delta against the no-streaming baseline.
    const baseline = Unhead().webpack() as any[]
    const withStreaming = Unhead({ streaming: true }).webpack() as any[]
    expect(Array.isArray(withStreaming)).toBe(true)
    expect(withStreaming.every(p => typeof p?.apply === 'function')).toBe(true)
    expect(withStreaming.length).toBe(baseline.length + 1)
  })

  it('rspack returns a plugin array dispatched via the rspack bundler hook', () => {
    const plugins = Unhead({ streaming: true }).rspack() as any[]
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.length).toBeGreaterThan(0)
  })

  it('rollup returns a plugin array dispatched via the rollup bundler hook', () => {
    const plugins = Unhead({ streaming: true }).rollup() as any[]
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.length).toBeGreaterThan(0)
  })
})
