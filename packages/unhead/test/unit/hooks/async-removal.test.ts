import { createHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'

describe('async hook removal during callHook', () => {
  it('runs the next registered hook when an earlier hook is removed while pending', async () => {
    const head = createHead({ disableDefaults: true })
    const calls: string[] = []
    let releaseFirst: () => void = () => {}
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const unhookFirst = head.hooks.hook('ssr:beforeRender', async () => {
      calls.push('first')
      await firstGate
    })
    head.hooks.hook('ssr:beforeRender', () => {
      calls.push('second')
    })

    const pending = head.hooks.callHook('ssr:beforeRender', { shouldRender: true })
    unhookFirst()
    releaseFirst()
    await pending

    expect(calls).toEqual(['first', 'second'])
  })
})
