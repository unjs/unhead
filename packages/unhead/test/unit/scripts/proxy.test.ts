// @vitest-environment jsdom
import type { AsVoidFunctions } from '../../../src/scripts/types'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createHead } from '../../../src/client'
import { useScript } from '../../../src/composables'
import { createScriptProxy } from '../../../src/scripts/proxy'
import { createSpyProxy } from '../../../src/scripts/utils'

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

export interface GTag {
  (fn: 'js', opt: Date): void
  (fn: 'config' | 'get', opt: string): void
  (fn: 'event', opt: string, opt2?: Record<string, any>): void
  (fn: 'set', opt: Record<string, string>): void
  (fn: 'consent', opt: 'default' | 'update', opt2: Record<string, string | number>): void
}

interface GoogleAnalytics {
  gtag: GTag
}

describe('proxy chain', () => {
  it('augments types', () => {
    const proxy = createScriptProxy<Api>()
    expectTypeOf(proxy.proxy._paq).toBeArray()
    expectTypeOf(proxy.proxy.doSomething).toBeFunction()
    expectTypeOf(proxy.proxy.doSomething).returns.toBeVoid()
    expectTypeOf(proxy.proxy.say).parameter(0).toBeString()
    expectTypeOf(proxy.proxy.foo.bar.fn).toBeFunction()
  })
  it('e2e', async () => {
    // do recording
    const { proxy, stack, resolve } = createScriptProxy<Api>()
    const script = { proxy, instance: null }
    script.proxy._paq.push(['test'])
    script.proxy.say('hello world')
    expect(stack.length).toBe(2)
    let called
    const w: any = {
      _paq: createSpyProxy([], () => {
        called = true
      }),
      say: (s: string) => {
        console.log(s)
        return s
      },
    }
    // did load
    // @ts-expect-error untyped
    script.instance = {
      _paq: w._paq,
      say: w.say,
    }
    const log = console.log
    // replay recording
    const consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
      log('mocked', ...args)
    })
    // replay recording and switch the (same) proxy over to forwarding
    // @ts-expect-error untyped
    resolve(script.instance)
    expect(consoleMock).toHaveBeenCalledWith('hello world')
    script.proxy.say('proxy updated!')
    expect(consoleMock).toHaveBeenCalledWith('proxy updated!')
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
    script.proxy._paq.push(['test'])
    consoleMock.mockReset()
    expect(called).toBe(true)
  })
  it('spy', () => {
    const w: any = {}
    w._paq = []
    const stack: any[] = []
    w._paq = createSpyProxy(w._paq, (s) => {
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
              "value": 0,
            },
          ],
        ],
      ]
    `)
  })
  it('use() provided', () => {
    const head = createHead()
    const instance = useScript(head, {
      src: 'https://cdn.example.com/script.js',
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

  it('applies vendor methods against their raw owner', () => {
    // native APIs brand check their receiver, so they must never see the proxy as `this`
    const branded = new WeakSet<object>()
    const canvas = {
      getBoundingClientRect() {
        if (!branded.has(this)) {
          throw new TypeError('Illegal invocation')
        }
        return { width: 120 }
      },
    }
    branded.add(canvas)
    const api = {
      canvas,
      addConfetti() {
        return this.canvas.getBoundingClientRect().width
      },
    }

    const { proxy, resolve } = createScriptProxy<typeof api>()
    resolve(api)

    expect(() => proxy.addConfetti()).not.toThrow()
    // nested objects are handed back raw so vendor internals keep working
    expect(proxy.canvas).toBe(canvas)
  })

  it('keeps references taken before load working after load', () => {
    const greet = vi.fn((s: string) => s)
    const { proxy, resolve } = createScriptProxy<{ greet: (s: string) => string }>()
    // destructured in setup, before the script has loaded
    const heldProxy = proxy
    const heldMethod = proxy.greet

    proxy.greet('before')
    resolve({ greet })

    expect(greet).toHaveBeenCalledWith('before')
    heldProxy.greet('after-via-object')
    heldMethod('after-via-method')
    expect(greet).toHaveBeenCalledWith('after-via-object')
    expect(greet).toHaveBeenCalledWith('after-via-method')
  })

  it('has a stable identity either side of load', () => {
    const api = { say: (s: string) => s }
    const { proxy, resolve } = createScriptProxy<typeof api>()
    expect(proxy.say).toBe(proxy.say)
    resolve(api)
    expect(proxy.say).toBe(proxy.say)
    // calls stay void once forwarding
    expect(proxy.say('x')).toBeUndefined()
  })

  it('replays calls after async use() resolves', async () => {
    const head = createHead()
    const { promise, resolve } = Promise.withResolvers<{ greet: (foo: string) => string }>()
    const instance = useScript(head, '/async-proxy.js', {
      trigger: 'server',
      use: () => promise,
    })
    const greet = vi.fn((foo: string) => foo)

    instance.proxy.greet('hello-world')
    ;(instance as any).input.onload(new Event('load'))
    resolve({ greet })
    await instance._loadPromise

    expect(greet).toHaveBeenCalledWith('hello-world')
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

  it('gtag types', () => {
    expectTypeOf<AsVoidFunctions<GoogleAnalytics>['gtag']>().toBeFunction()
  })
})
