import { describe, expect, it } from 'vitest'
import {
  createStreamingPlugin,
  VIRTUAL_CLIENT_ID,
  VIRTUAL_IIFE_ID,
} from '../../src/stream/unplugin'

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
