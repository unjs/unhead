import { describe, expect, it } from 'vitest'
import { walkResolver } from '../../src/utils'

describe('walkResolver', () => {
  it('returns static input by reference', () => {
    const input = { title: 'a', meta: [{ name: 'description', content: 'b' }] }
    expect(walkResolver(input)).toBe(input)
    expect(walkResolver(input, (_, v) => v)).toBe(input)
  })

  it('copies only the branches that changed', () => {
    const link = [{ rel: 'icon', href: '/a.ico' }]
    const input = { title: () => 'a', meta: [{ name: 'x', content: 'y' }, { name: 'z', content: () => 'w' }], link }
    const out = walkResolver(input)
    expect(out).toEqual({ title: 'a', meta: [{ name: 'x', content: 'y' }, { name: 'z', content: 'w' }], link })
    expect(out).not.toBe(input)
    expect(out.link).toBe(link)
    expect(out.meta).not.toBe(input.meta)
    expect(out.meta[0]).toBe(input.meta[0])
    expect(Object.keys(out)).toEqual(['title', 'meta', 'link'])
  })

  it('keeps titleTemplate and event handler functions', () => {
    const titleTemplate = (t?: string) => `${t} | site`
    const onload = () => {}
    const out = walkResolver({ titleTemplate, script: [{ src: '/a.js', onload }] })
    expect(out.titleTemplate).toBe(titleTemplate)
    expect(out.script[0].onload).toBe(onload)
  })

  it('calls functions at the root and in arrays', () => {
    expect(walkResolver(() => ({ title: 'a' }))).toEqual({ title: 'a' })
    expect(walkResolver([() => 'a', 'b'])).toEqual(['a', 'b'])
  })

  it('passes the object key to the resolver and no key for the root and array items', () => {
    const keys: (string | undefined)[] = []
    walkResolver({ meta: [{ name: 'a' }] }, (key, v) => {
      keys.push(key)
      return v
    })
    expect(keys).toEqual([undefined, 'meta', undefined, 'name'])
  })

  it('applies the resolver result', () => {
    const out = walkResolver({ title: { value: 'a' } }, (_, v) => v?.value ?? v)
    expect(out).toEqual({ title: 'a' })
  })

  it('returns _resolver values without walking them', () => {
    const _resolver = () => 'kept'
    const out = walkResolver({ _resolver, title: () => 'a' })
    expect(out._resolver).toBe(_resolver)
  })

  it('drops unsafe keys before and after a changed key', () => {
    // an own `constructor` key fails the plain object check, so it is not used here
    const input = JSON.parse('{"__proto__":{"polluted":true},"a":"x","prototype":"p"}')
    input.b = () => 'y'
    const out = walkResolver(input)
    expect(Object.keys(out)).toEqual(['a', 'b'])
    expect(out.b).toBe('y')
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('drops an unsafe key from otherwise unchanged input', () => {
    const input = JSON.parse('{"a":"x","__proto__":{"polluted":true}}')
    const out = walkResolver(input)
    expect(out).not.toBe(input)
    expect(Object.keys(out)).toEqual(['a'])
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype)
  })
})
