import { createHead } from 'unhead'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createNoopedRecordingProxy, createSpyProxy, replayProxyRecordings } from '../../src/utils/proxy'
import { useScript } from '../../src/vanilla/useScript'

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
  it('use() provided', () => {
    const head = createHead()
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
    const consoleMock = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    instance.proxy.greet('hello-world')
    expect(consoleMock).toHaveBeenCalledWith('hello-world')
  })
})
