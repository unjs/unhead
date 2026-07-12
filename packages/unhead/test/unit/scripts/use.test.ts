import type { ActiveHeadEntry, ResolvableHead } from '../../../src/types'
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

  it('types: reflects lifecycle return values', () => {
    interface ScriptApi {
      track: (event: string) => boolean
    }

    const head = createServerHead()
    const instance = useScript<ScriptApi>(head, 'https://cdn.example.com/script.js', {
      trigger: 'manual',
      use: () => ({ track: () => true }),
    })

    expectTypeOf(instance.instance).toEqualTypeOf<ScriptApi | null>()
    expectTypeOf(instance.load()).toEqualTypeOf<Promise<ScriptApi | false>>()
    expectTypeOf(instance.warmup(false)).toEqualTypeOf<ActiveHeadEntry<ResolvableHead> | undefined>()
    expectTypeOf(instance.onLoaded(() => {})).toEqualTypeOf<() => void>()
    expectTypeOf(instance.onError(() => {})).toEqualTypeOf<() => void>()

    const _opaque = useScript(head, 'https://cdn.example.com/opaque.js', { trigger: 'manual' })
    expectTypeOf<(typeof _opaque.proxy)['arbitrary']>().toBeNever()
  })
})
