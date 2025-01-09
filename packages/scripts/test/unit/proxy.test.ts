import type { AsVoidFunctions } from '../../src'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createServerHeadWithContext } from '../../../../test/util'
import { createNoopedRecordingProxy, createSpyProxy, replayProxyRecordings } from '../../src/proxy'
import { useScript } from '../../src/useScript'

interface Api {
  _paq: any[]
  doSomething: () => Promise<'foo'>
  say: (message: string) => string
  foo: {
    bar: {
      fn: () => true
    }
  }
}

describe('proxy chain', () => {
  it('augments types', () => {
    const proxy = createNoopedRecordingProxy<Api>()
    expectTypeOf(proxy.proxy._paq).toBeArray()
    expectTypeOf(proxy.proxy.doSomething).toBeFunction()
    expectTypeOf(proxy.proxy.doSomething).returns.toBeVoid()
    expectTypeOf(proxy.proxy.say).parameter(0).toBeString()
    expectTypeOf(proxy.proxy.foo.bar.fn).toBeFunction()
  })
  it('basic queue', async () => {
    const script: { instance: (null | Api) } = { instance: null }
    // do recording
    const { proxy, stack } = createNoopedRecordingProxy<Api>()
    proxy._paq.push(['test'])
    proxy.say('hello world')
    expect(stack.length).toBe(2)

    script.instance = {
      _paq: [],
      say(s: string) {
        console.log(s)
        return s
      },
    }
    // replay recording
    const consoleMock = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    replayProxyRecordings(script.instance, stack)
    expect(consoleMock).toHaveBeenCalledWith('hello world')
    expect(script.instance).toMatchInlineSnapshot(`
      {
        "_paq": [
          [
            "test",
          ],
        ],
        "say": [Function],
      }
    `)
    consoleMock.mockReset()
  })
  it('spy', () => {
    const w = {}
    w._paq = []
    const stack = []
    // eslint-disable-next-line unused-imports/no-unused-vars
    w._paq = createSpyProxy(w._paq, (s, arg) => {
      stack.push(s)
    })
    w._paq.push(['test'])
    expect(stack).toMatchInlineSnapshot(`
      [
        [
          [
            {
              "key": "push",
              "type": "get",
            },
            {
              "args": [
                [
                  "test",
                ],
              ],
              "key": "",
              "type": "apply",
            },
          ],
          [
            {
              "key": "length",
              "type": "get",
            },
          ],
        ],
      ]
    `)
  })
  it('should keep array properties unchanged', () => {
    type Result = AsVoidFunctions<Api>
    expectTypeOf<Result['arrayProp']>().toEqualTypeOf<string[]>()
  })

  it('should convert function properties to void functions', () => {
    type Result = AsVoidFunctions<Api>
    expectTypeOf<Result['funcProp']>().toBeFunction()
    expectTypeOf<Result['funcProp']>().parameters.toEqualTypeOf<[number]>()
    expectTypeOf<Result['funcProp']>().returns.toBeVoid()
  })

  it('should recursively convert nested function properties to void functions', () => {
    type Result = AsVoidFunctions<Api>
    expectTypeOf<Result['nestedProp']['innerFunc']>().toBeFunction()
    expectTypeOf<Result['nestedProp']['innerFunc']>().parameters.toEqualTypeOf<[boolean]>()
    expectTypeOf<Result['nestedProp']['innerFunc']>().returns.toBeVoid()
  })
  it('use() provided', () => {
    const head = createServerHeadWithContext()
    const instance = useScript({
      src: 'https://cdn.example.com/script.js',
      head,
    }, {
      use() {
        return {
          greet: (foo: string) => {
            console.log(foo)
            return foo
          },
        }
      },
    })
    instance.onLoaded((vm) => {
      vm.greet('hello-world')
    })
    const consoleMock = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    expectTypeOf(instance.proxy.greet).toBeFunction()
    instance.proxy.greet('hello-world')
    expect(consoleMock).toHaveBeenCalledWith('hello-world')
  })
})

describe('types: AsVoidFunctions', () => {
  it('should keep array properties unchanged', () => {
    type Result = AsVoidFunctions<Api>
    expectTypeOf<Result['_paq']>().toEqualTypeOf<any[]>()
  })

  it('should convert function properties to void functions', () => {
    type Result = AsVoidFunctions<Api>
    expectTypeOf<Result['doSomething']>().toBeFunction()
    expectTypeOf<Result['doSomething']>().returns.toBeVoid()
    expectTypeOf<Result['say']>().toBeFunction()
    expectTypeOf<Result['say']>().parameters.toEqualTypeOf<[string]>()
    expectTypeOf<Result['say']>().returns.toBeVoid()
  })

  it('should recursively convert nested function properties to void functions', () => {
    type Result = AsVoidFunctions<Api>
    expectTypeOf<Result['foo']['bar']['fn']>().toBeFunction()
    expectTypeOf<Result['foo']['bar']['fn']>().returns.toBeVoid()
  })
})
