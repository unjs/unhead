import { describe, expectTypeOf, it } from 'vitest'
import { useScript } from '../../../src/composables'
import { createHead as createServerHead } from '../../../src/server'

describe('useScript', () => {
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
    expectTypeOf(instance.onLoaded(() => {})).toEqualTypeOf<() => void>()
  })
})
