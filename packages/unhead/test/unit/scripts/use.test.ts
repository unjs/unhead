import type { UseScriptOptions, UseScriptTrigger } from '../../../src/scripts'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { useScript } from '../../../src/composables'
import { createHead as createServerHead } from '../../../src/server'

describe('useScript', () => {
  it('isolates shared scripts by SSR head instance', () => {
    const requestA = createServerHead()
    const requestB = createServerHead()
    const scopeA1 = useScript(requestA, '/request-local.js', { scope: true, trigger: 'manual' })
    const scopeA2 = useScript(requestA, '/request-local.js', { scope: true, trigger: 'manual' })
    const scopeB = useScript(requestB, '/request-local.js', { scope: true, trigger: 'manual' })

    expect(scopeA1.script).toBe(scopeA2.script)
    expect(scopeA1.script).not.toBe(scopeB.script)
    expect(requestA._scripts?.['/request-local.js']).toBe(scopeA1.script)
    expect(requestB._scripts?.['/request-local.js']).toBe(scopeB.script)
  })

  it('does not retain an SSR head through a reused input object', () => {
    const onload = () => {}
    const input = { src: '/reused.js', onload }

    useScript(createServerHead(), input, { trigger: 'server' })
    useScript(createServerHead(), input, { trigger: 'server' })

    expect(input.onload).toBe(onload)
  })

  it('keeps script-only options out of the head entry without mutating the caller', () => {
    const head = createServerHead()
    const beforeInit = vi.fn()
    const use = () => ({ ready: true })
    const options = {
      beforeInit,
      eventContext: { request: true },
      scope: false as const,
      tagPriority: 'high' as const,
      trigger: 'server' as const,
      use,
    }
    const original = { ...options }
    const push = vi.spyOn(head, 'push')

    useScript(head, '/entry-options.js', options)

    expect(options).toEqual(original)
    expect(beforeInit).toHaveBeenCalledOnce()
    expect(push).toHaveBeenCalledWith(expect.anything(), {
      tagPriority: 'high',
    })
  })

  it('types: inferred use()', async () => {
    const head = createServerHead()
    const instance = useScript(head, {
      src: 'https://cdn.example.com/script.js',
    }, {
      use() {
        return {
          // eslint-disable-next-line unused-imports/no-unused-vars
          test: (foo: string) => 'foo',
        }
      },
    })
    expectTypeOf(instance.proxy.test).toBeFunction()
    expectTypeOf(instance.proxy.test).parameter(0).toBeString()
    expectTypeOf(instance.proxy.test).returns.toBeVoid()
  })

  it('types: inferred async resolve() context', () => {
    const head = createServerHead()
    const instance = useScript(head, '/script.js', {
      scope: true,
      async resolve({ signal, waitFor }) {
        expectTypeOf(signal).toEqualTypeOf<AbortSignal>()
        expectTypeOf(waitFor<{ ready: true }>(resolve => resolve({ ready: true }))).toEqualTypeOf<Promise<{ ready: true }>>()
        const readyOrPromise = { ready: true } as { ready: true } | PromiseLike<{ ready: true }>
        expectTypeOf(waitFor<{ ready: true }>(resolve => resolve(readyOrPromise))).toEqualTypeOf<Promise<{ ready: true }>>()
        return {
          test: (foo: string) => foo,
        }
      },
    })

    expectTypeOf(instance.proxy.test).toBeFunction()
    expectTypeOf(instance.proxy.test).parameter(0).toBeString()
    expectTypeOf(instance.signal).toEqualTypeOf<AbortSignal>()
    expectTypeOf(instance.script.signal).toEqualTypeOf<AbortSignal>()
    expectTypeOf(instance.dispose).returns.toBeVoid()
    expectTypeOf(instance.onLoaded(() => {})).toEqualTypeOf<() => void>()
  })

  it('types: infers resolve() API through waitFor()', () => {
    const head = createServerHead()
    const api = { ready: true as const, method: (value: string) => value.length }
    const instance = useScript(head, '/inferred-ready-script.js', {
      resolve: ({ waitFor }) => waitFor(resolve => resolve(api)),
    })
    const instanceWithCleanup = useScript(head, '/cleanup-ready-script.js', {
      resolve: ({ waitFor }) => waitFor<typeof api>((resolve) => {
        void resolve
        return () => {}
      }),
    })

    const checkInference = async () => {
      const inferred: typeof api = await instance.load()
      inferred.method('ok')
    }
    type Loaded = Awaited<ReturnType<typeof instance.load>>
    type LoadedWithCleanup = Awaited<ReturnType<typeof instanceWithCleanup.load>>
    expectTypeOf<Loaded>().toEqualTypeOf<typeof api>()
    expectTypeOf<LoadedWithCleanup>().toEqualTypeOf<typeof api>()
    const notAny: 0 extends (1 & Loaded) ? never : true = true
    void checkInference
    void instanceWithCleanup
    void notAny
  })

  it('types: accepts legacy default-parameter use() callbacks', () => {
    const options: UseScriptOptions = {
      use: (root = window) => ({ root }),
    }

    expectTypeOf(options.use!).toBeFunction()
  })

  it('types: preserves permissive triggers and dynamic scope returns', () => {
    const head = createServerHead()
    const trigger: UseScriptTrigger = async (load) => {
      load()
      return true
    }
    const options: UseScriptOptions = {
      scope: Math.random() > 0.5,
      trigger,
    }
    const instance = useScript(head, '/dynamic-scope.js', options)

    expectTypeOf(instance.load).toBeFunction()
  })
})
