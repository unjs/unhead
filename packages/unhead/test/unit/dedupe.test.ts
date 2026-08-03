import { describe, expect, it } from 'vitest'
import { hashTag, isMetaArrayDupeKey } from '../../src/utils/dedupe'

describe('hashTag', () => {
  it('is stable across prop insertion order', () => {
    expect(hashTag({
      tag: 'script',
      props: { defer: true as any, src: '/app.js' },
    })).toBe(hashTag({
      tag: 'script',
      props: { src: '/app.js', defer: true as any },
    }))
  })
})

describe('isMetaArrayDupeKey', () => {
  it('only treats structured Twitter images as arrayable', () => {
    expect(isMetaArrayDupeKey('meta:twitter:card')).toBe(false)
    expect(isMetaArrayDupeKey('meta:twitter:title')).toBe(false)
    expect(isMetaArrayDupeKey('meta:twitter:description')).toBe(false)
    expect(isMetaArrayDupeKey('meta:twitter:image')).toBe(true)
    expect(isMetaArrayDupeKey('meta:twitter:image:alt')).toBe(true)
  })
})
