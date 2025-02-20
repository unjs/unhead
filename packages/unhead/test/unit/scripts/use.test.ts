import { createHead as createServerHead } from 'unhead/server'
import { describe, expectTypeOf, it } from 'vitest'
import { useScript } from '../../../src/composables'

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
})
