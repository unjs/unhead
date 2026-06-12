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
      head.hooks.callHook('script:updated', { script: { id: instance.id, status: 'loaded' } as any })
    })).toBeTruthy()
  })
  it('fires onLoaded when requestAnimationFrame is suspended (hidden tab) - #771', async () => {
    // browsers suspend rAF callbacks entirely while a tab is hidden; stub it to a no-op
    const originalRaf = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (() => 0) as any
    try {
      const head = createHead()
      const instance = useScript(head, '/script.js', {
        trigger: 'server',
      })
      await expect(new Promise<true>((resolve) => {
        instance.onLoaded(() => {
          resolve(true)
        })
        head.hooks.callHook('script:updated', { script: { id: instance.id, status: 'loaded' } as any })
      })).resolves.toBeTruthy()
    }
    finally {
      globalThis.requestAnimationFrame = originalRaf
    }
  })
  it('fires onLoaded registered after status=loaded when rAF is suspended (hidden tab) - #771', async () => {
    // late registrations are also gated behind the load promise resolving, so they must
    // not depend on requestAnimationFrame either
    const originalRaf = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (() => 0) as any
    try {
      const head = createHead()
      const instance = useScript(head, '/script.js', {
        trigger: 'server',
      })
      head.hooks.callHook('script:updated', { script: { id: instance.id, status: 'loaded' } as any })
      // register after the load hook already fired
      await expect(new Promise<true>((resolve) => {
        instance.onLoaded(() => {
          resolve(true)
        })
      })).resolves.toBeTruthy()
    }
    finally {
      globalThis.requestAnimationFrame = originalRaf
    }
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
      head.hooks.callHook('script:updated', { script: { id: instance.id, status: 'loaded' } as any })
    })
    expect(calls).toMatchInlineSnapshot(`
      [
        "a",
        "c",
      ]
    `)
  })
})
