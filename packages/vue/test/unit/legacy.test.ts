import { PromisesPlugin } from 'unhead/plugins'
import { describe, expect, it } from 'vitest'
import { legacyPlugins } from '../../src/legacy'

describe('legacy plugins', () => {
  it('includes Promise input compatibility', () => {
    expect(legacyPlugins).toContain(PromisesPlugin)
  })
})
