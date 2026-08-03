import { describe, expect, it } from 'vitest'
import { walkResolver } from '../../src/utils/walkResolver'

describe('walkResolver structural sharing', () => {
  it('reuses a static input tree', () => {
    const input = {
      title: 'Static',
      meta: [{ name: 'description', content: 'static' }],
    }

    const resolved = walkResolver(input)

    expect(resolved).toBe(input)
    expect(resolved.meta).toBe(input.meta)
    expect(resolved.meta[0]).toBe(input.meta[0])
  })

  it('copies only branches changed by a resolver', () => {
    const stable = { name: 'author', content: 'Harlan' }
    const dynamic = { name: 'description', content: () => 'resolved' }
    const input = { meta: [stable, dynamic] }

    const resolved = walkResolver(input)

    expect(resolved).not.toBe(input)
    expect(resolved.meta).not.toBe(input.meta)
    expect(resolved.meta[0]).toBe(stable)
    expect(resolved.meta[1]).not.toBe(dynamic)
    expect(resolved.meta[1].content).toBe('resolved')
  })

  it('drops unsafe keys without changing the result prototype', () => {
    const input = { title: 'Safe' }
    Object.defineProperty(input, '__proto__', {
      enumerable: true,
      value: { polluted: true },
    })

    const resolved = walkResolver(input)

    expect(resolved).not.toBe(input)
    expect(Object.getPrototypeOf(resolved)).toBe(Object.prototype)
    expect(Object.prototype.hasOwnProperty.call(resolved, '__proto__')).toBe(false)
  })
})
