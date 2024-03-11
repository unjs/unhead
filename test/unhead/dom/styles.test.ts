import { describe, it } from 'vitest'
import { useHead } from 'unhead'
import { activeDom, useDOMHead, useDelayedSerializedDom } from './util'

describe('styles', () => {
  it('basic', async () => {
    useDOMHead()

    useHead({
      htmlAttrs: {
        style: `--foo:bar`,
      },
    })!

    const el = useHead({
      htmlAttrs: {
        style: `--color-primary:red;--color-secondary:blue;`,
      },
    })!

    activeDom?.window.document.documentElement.style.setProperty('--header-height', '50px')

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html style="--header-height: 50px; --foo: bar; --color-primary: red; --color-secondary: blue;"><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    el.dispose()

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html style="--header-height: 50px; --foo: bar;"><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
