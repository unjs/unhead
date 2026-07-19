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
  it('replays every entry in queued and future module-mode batches', () => {
    const plugin = createStreamingPlugin.raw({
      framework: '@unhead/test',
      mode: 'module',
      warnOnMissingServerBootstrap: false,
    }, { framework: 'rollup' } as any) as any
    const loaded = callLoad(plugin, RESOLVED_CLIENT_ID)
    const code = loaded.code.replace(/^import[^\n]+\n/, '')
    const pushed: any[] = []
    const stream = {
      _q: [[{ title: 'queued' }, { meta: [{ name: 'description', content: 'queued' }] }]],
      push: (_batch: any[]) => 0,
    }
    // eslint-disable-next-line no-new-func -- execute the generated local fixture
    new Function('window', 'document', 'createHead', code)(
      { __unhead__: stream },
      {},
      () => ({ push: (entry: any) => pushed.push(entry) }),
    )
    expect(pushed).toEqual([{ title: 'queued' }, { meta: [{ name: 'description', content: 'queued' }] }])

    stream.push([{ title: 'future' }, { htmlAttrs: { lang: 'en' } }])
    expect(pushed.slice(2)).toEqual([{ title: 'future' }, { htmlAttrs: { lang: 'en' } }])
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
