import { describe, expect, it } from 'vitest'
import { isMetaArrayDupeKey } from '../../src/utils/dedupe'

describe('isMetaArrayDupeKey', () => {
  it('only treats structured Twitter images as arrayable', () => {
    expect(isMetaArrayDupeKey('meta:twitter:card')).toBe(false)
    expect(isMetaArrayDupeKey('meta:twitter:title')).toBe(false)
    expect(isMetaArrayDupeKey('meta:twitter:description')).toBe(false)
    expect(isMetaArrayDupeKey('meta:twitter:image')).toBe(true)
    expect(isMetaArrayDupeKey('meta:twitter:image:alt')).toBe(true)
  })
})
