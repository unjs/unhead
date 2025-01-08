import { createHead } from 'unhead'
import { describe, expectTypeOf, it } from 'vitest'
import { createServerHeadWithContext } from '../../../../test/util'
import { useScript } from '../../src/vanilla/useScript'

describe('useScript', () => {
  it('types: inferred use()', async () => {
    const instance = useScript({
      src: 'https://cdn.example.com/script.js',
    }, {
      head: createServerHeadWithContext(),
      use() {
        return {
          test: (foo: string) => 'foo',
        }
      },
    })
    expectTypeOf(instance.proxy.test).toBeFunction()
    expectTypeOf(instance.proxy.test).parameter(0).toBeString()
    expectTypeOf(instance.proxy.test).returns.toBeVoid()
  })
})
