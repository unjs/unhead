import { describe, expect, it, vi } from 'vitest'
import { createHooks } from '../../../src/utils/hooks'

describe('createHooks', () => {
  it('registers, calls, and unsubscribes synchronous hooks in order', () => {
    const order: string[] = []
    const hooks = createHooks({
      'entries:updated': () => {
        order.push('init')
      },
    })
    const offA = hooks.hook('entries:updated', () => {
      order.push('a')
    })
    hooks.hook('entries:updated', () => {
      order.push('b')
    })

    expect(hooks.callHook('entries:updated', {} as any)).toBeUndefined()
    expect(order).toEqual(['init', 'a', 'b'])

    // unsubscribe is idempotent
    offA()
    offA()
    order.length = 0
    hooks.callHook('entries:updated', {} as any)
    expect(order).toEqual(['init', 'b'])
  })

  it('removes listeners with removeHook and clears empty hook buckets', () => {
    const fn = vi.fn()
    const hooks = createHooks()
    hooks.hook('entries:updated', fn)
    hooks.removeHook('entries:updated', fn)
    hooks.callHook('entries:updated', {} as any)
    expect(fn).not.toHaveBeenCalled()
    expect((hooks as any)._hooks['entries:updated']).toBeUndefined()
  })

  it('chains async hooks sequentially and converts sync throws to rejections', async () => {
    const order: string[] = []
    const hooks = createHooks()
    hooks.hook('entries:updated', async () => {
      await Promise.resolve()
      order.push('first')
    })
    hooks.hook('entries:updated', () => {
      order.push('second')
    })
    await hooks.callHook('entries:updated', {} as any)
    expect(order).toEqual(['first', 'second'])

    const throwing = createHooks()
    throwing.hook('entries:updated', () => {
      throw new Error('boom')
    })
    await expect(throwing.callHook('entries:updated', {} as any)).rejects.toThrow('boom')
  })

  it('ignores empty hook names and non-function callbacks', () => {
    const hooks = createHooks()
    const offEmpty = hooks.hook('' as any, vi.fn())
    const offInvalid = hooks.hook('entries:updated', undefined as any)
    offEmpty()
    offInvalid()
    expect(hooks.callHook('entries:updated', {} as any)).toBeUndefined()
  })

  it('reuses existing hook storage when upgrading deferred setup hooks', () => {
    const fn = vi.fn()
    const storage: Record<string, any> = { 'entries:updated': [fn] }
    const hooks = createHooks(undefined, storage)
    hooks.callHook('entries:updated', {} as any)
    expect(fn).toHaveBeenCalledOnce()
    hooks.removeHook('entries:updated', fn)
    expect(storage['entries:updated']).toBeUndefined()
  })
})
