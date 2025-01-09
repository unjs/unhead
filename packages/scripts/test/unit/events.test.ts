// @vitest-environment jsdom

import { describe, it } from 'vitest'
import { createHeadWithContext } from '../../../../test/util'
import { useScript } from '../../src/useScript'

describe('useScript events', () => {
  it('simple', async () => {
    createHeadWithContext()
    const instance = useScript('/script.js', {
      trigger: 'server',
    })
    expect(await new Promise<true>((resolve) => {
      instance.status = 'loaded'
      instance.onLoaded(() => {
        resolve(true)
      })
    })).toBeTruthy()
  })
  it('dedupe', async () => {
    createHeadWithContext()
    const instance = useScript('/script.js', {
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
    instance.status = 'loaded'
    await new Promise<void>((resolve) => {
      instance.onLoaded(() => {
        calls.push('c')
        resolve()
      })
    })
    expect(calls).toMatchInlineSnapshot(`
      [
        "a",
        "c",
      ]
    `)
  })
})
