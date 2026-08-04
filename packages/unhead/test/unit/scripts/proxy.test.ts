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
    // replay recording and switch the same proxy to forwarding
    const consoleMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
      log('mocked', ...args)
    })
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

  it('keeps proxy references working after load', async () => {
    const head = createHead()
    const greet = vi.fn()
    let loaded = false
    const instance = useScript(head, '/stable-proxy.js', {
      trigger: 'manual',
      use: () => loaded ? { greet } : undefined,
    })
    const heldProxy = instance.proxy
    const heldMethod = instance.proxy.greet

    heldProxy.greet('before')
    loaded = true
    instance.load()
    instance.status = 'loaded'
    await head.hooks.callHook('script:updated', { script: instance })
    await instance._loadPromise

    heldProxy.greet('after-object')
    heldMethod('after-method')
    expect(greet).toHaveBeenCalledWith('before')
    expect(greet).toHaveBeenCalledWith('after-object')
    expect(greet).toHaveBeenCalledWith('after-method')
  })

  it('applies proxied methods against their raw owner', async () => {
    const head = createHead()
    const branded = new WeakSet<object>()
    const canvas = {
      readWidth() {
        if (!branded.has(this))
          throw new TypeError('Illegal invocation')
        return 120
      },
    }
    branded.add(canvas)
    const api = {
      canvas,
      readWidth() {
        return this.canvas.readWidth()
      },
    }
    let loaded = false
    const instance = useScript(head, '/raw-receiver.js', {
      trigger: 'manual',
      use: () => loaded ? api : undefined,
    })

    loaded = true
    instance.load()
    instance.status = 'loaded'
    await head.hooks.callHook('script:updated', { script: instance })
    await instance._loadPromise

    expect(() => instance.proxy.readWidth()).not.toThrow()
    expect(instance.proxy.canvas).toBe(canvas)
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
    // eslint-disable-next-line unused-imports/no-unused-vars
    const gtag = {} as AsVoidFunctions<GoogleAnalytics>['gtag']
    expectTypeOf<typeof gtag>().toBeFunction()
  })
})
