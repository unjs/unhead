import type { Unhead } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { defineHeadPlugin } from '../../../src/plugins/defineHeadPlugin'
import { createServerHeadWithContext } from '../../util'

describe('plugin dedupe', () => {
  it('runs a keyed function plugin setup only once across re-registration', () => {
    let setups = 0
    const plugin = defineHeadPlugin((head: Unhead) => {
      setups++
      head.push({ meta: [{ name: 'generator', content: 'unhead' }] })
      return { key: 'my-plugin' }
    }, 'my-plugin')

    const head = createServerHeadWithContext({ plugins: [plugin] })
    head.use(plugin)
    head.use(plugin)

    expect(setups).toBe(1)
    expect(head.plugins.has('my-plugin')).toBe(true)
  })

  it('does not dedupe function plugins without a static key', () => {
    let setups = 0
    const plugin = defineHeadPlugin(() => {
      setups++
      return { key: `anon-${setups}` }
    })

    const head = createServerHeadWithContext({ plugins: [plugin] })
    head.use(plugin)

    expect(setups).toBe(2)
  })
})
