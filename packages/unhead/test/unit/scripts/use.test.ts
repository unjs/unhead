import { describe, expect, expectTypeOf, it } from 'vitest'
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

  it('types: inferred async use() context', () => {
    const head = createServerHead()
    const instance = useScript(head, '/script.js', {
      scope: true,
      async use({ signal, waitFor }) {
        expectTypeOf(signal).toEqualTypeOf<AbortSignal>()
        expectTypeOf(waitFor<{ ready: true }>(resolve => resolve({ ready: true }))).toEqualTypeOf<Promise<{ ready: true }>>()
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
})
