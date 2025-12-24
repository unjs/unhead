import { describe, expect, it } from 'vitest'
// @vitest-environment jsdom
import { createHead } from '../../../src/client'
import { useScript } from '../../../src/composables'

describe('useScript events', () => {
  it('simple', async () => {
    const head = createHead()
    const instance = useScript(head, '/script.js', {
      trigger: 'server',
    })
    expect(await new Promise<true>((resolve) => {
      instance.onLoaded(() => {
        resolve(true)
      })
      // Trigger the hook to simulate the script being loaded
      head.hooks.callHook('script:updated', { script: { id: instance.id, status: 'loaded' } })
    })).toBeTruthy()
  })
  it('dedupe', async () => {
    const head = createHead()
    const instance = useScript(head, '/script.js', {
      trigger: 'server',
    })
    const calls: any[] = []
    instance.onLoaded(() => {
      calls.push('a')
    }, {
      key: 'once',
    })
    instance.onLoaded(() => {
      calls.push('b')
    }, {
      key: 'once',
    })
    await new Promise<void>((resolve) => {
      instance.onLoaded(() => {
        calls.push('c')
        resolve()
      })
      // Trigger the hook to simulate the script being loaded
      head.hooks.callHook('script:updated', { script: { id: instance.id, status: 'loaded' } })
    })
    expect(calls).toMatchInlineSnapshot(`
      [
        "a",
        "c",
      ]
    `)
  })
})
