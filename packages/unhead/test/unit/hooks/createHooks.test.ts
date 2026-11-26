import type { ClientHeadHooks, HeadHookable } from '../../../src/types'
import { describe, expect, it, vi } from 'vitest'
import { createHead as createLazyHead } from '../../../src/lazy'
import { createHead as createServerHead, renderSSRHead } from '../../../src/server'
import { createHooks } from '../../../src/utils/hooks'
import { useDom } from '../../util'

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

  it('dispatches hooks through a custom HeadHookable without an internal _hooks property', async () => {
    const createOpaqueRegistry = <T extends Record<string, any>>(): HeadHookable<T> => {
      const map = new Map<string, Set<(...args: any[]) => any>>()
      return {
        hook(name, fn) {
          let set = map.get(name)
          if (!set)
            map.set(name, set = new Set())
          set.add(fn)
          return () => {
            set?.delete(fn)
          }
        },
        removeHook(name, fn) {
          map.get(name)?.delete(fn)
        },
        callHook(name, ...args) {
          for (const fn of map.get(name) || [])
            fn(...args)
        },
      }
    }

    const dom = useDom()
    dom.window.document.title = 'Initial'
    const hookable = createOpaqueRegistry<ClientHeadHooks>()
    let allowRender = false
    let beforeRenderCalls = 0
    let resolveCalls = 0
    hookable.hook('dom:beforeRender', (ctx) => {
      beforeRenderCalls++
      ctx.shouldRender = allowRender
    })
    hookable.hook('tags:resolve', () => {
      resolveCalls++
    })

    const lazy = createLazyHead({ document: dom.window.document, hookable })
    lazy.push({ title: 'Updated' })
    const client = await lazy.load()
    await vi.waitFor(() => expect(beforeRenderCalls).toBeGreaterThan(0))
    expect(resolveCalls).toBe(0)
    expect(dom.window.document.title).toBe('Initial')

    allowRender = true
    client.push({ title: 'Allowed' })
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Allowed'))
    expect(resolveCalls).toBeGreaterThan(0)

    const ssr = createServerHead({ disableDefaults: true })
    ssr.hooks = createOpaqueRegistry()
    let ssrNormalized = false
    let ssrResolved = false
    ssr.hooks.hook('entries:normalize', () => {
      ssrNormalized = true
    })
    ssr.hooks.hook('tags:resolve', () => {
      ssrResolved = true
    })
    ssr.push({ title: 'Server' })
    expect(renderSSRHead(ssr).headTags).toContain('<title>Server</title>')
    expect(ssrNormalized).toBe(true)
    expect(ssrResolved).toBe(true)
  })
})
