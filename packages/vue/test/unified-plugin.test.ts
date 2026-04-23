import { describe, expect, it } from 'vitest'
import { Unhead as UnheadRollup } from '../src/rollup'
import { Unhead as UnheadRspack } from '../src/rspack'
import { Unhead as UnheadVite } from '../src/vite'
import { Unhead as UnheadWebpack } from '../src/webpack'

describe('unified Unhead({ streaming: true }) per bundler', () => {
  it('vite returns a plugin array including the streaming plugin', () => {
    const plugins = UnheadVite({ streaming: true }) as any[]
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.some(p => p?.name === '@unhead/vue:streaming')).toBe(true)
  })

  it('vite omits the streaming plugin when not enabled', () => {
    const plugins = UnheadVite() as any[]
    expect(plugins.some(p => p?.name === '@unhead/vue:streaming')).toBe(false)
  })

  it('webpack returns a plugin array including the streaming plugin when enabled', () => {
    const plugins = UnheadWebpack({ streaming: true }) as any[]
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.some(p => typeof p?.apply === 'function')).toBe(true)
  })

  it('rspack returns a plugin array including the streaming plugin when enabled', () => {
    const plugins = UnheadRspack({ streaming: true }) as any[]
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.some(p => typeof p?.apply === 'function')).toBe(true)
  })

  it('rollup returns a plugin array including the streaming plugin when enabled', () => {
    const plugins = UnheadRollup({ streaming: true }) as any[]
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.some(p => p?.name === '@unhead/vue:streaming')).toBe(true)
  })
})
