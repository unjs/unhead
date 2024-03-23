import { describe, it } from 'vitest'
import { useScript } from 'unhead'
import { useDOMHead, useDelayedSerializedDom } from './util'

describe('dom useScript', () => {
  it('basic', async () => {
    const head = useDOMHead()

    const instance = useScript<{ test: (foo: string) => void }>({
      src: 'https://cdn.example.com/script.js',
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <script data-onload="" data-onerror="" data-onloadstart="" defer="" fetchpriority="low" src="https://cdn.example.com/script.js" data-hid="438d65b"></script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    let calledFn
    let calledFnArgs
    const hookPromise = new Promise<void>((resolve) => {
      head.hooks.hook('script:instance-fn', ({ script, fn, args }) => {
        if (script.id === instance.$script.id) {
          calledFn = fn
          calledFnArgs = args
          resolve()
        }
      })
    })
    instance.test('hello-world')
    await hookPromise
    expect(calledFn).toBe('test')
    expect(calledFnArgs).toEqual(['hello-world'])
  })
})
