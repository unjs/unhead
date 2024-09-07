import { useHead } from 'unhead'
import { describe, it } from 'vitest'
import { activeDom, useDelayedSerializedDom, useDOMHead } from './util'

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
  it('overrides', async () => {
    useDOMHead()

    useHead({
      bodyAttrs: {
        style: '--c-bg: #03D57E;--c-text: #000;',
      },
    })

    const el = useHead({
      bodyAttrs: {
        style: '--c-bg: #000;--c-text: white;',
      },
    })

    activeDom?.window.document.documentElement.style.setProperty('--header-height', '50px')

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html style="--header-height: 50px;"><head>

      </head>
      <body style="--c-bg: #000; --c-text: white;">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    el.dispose()

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html style="--header-height: 50px;"><head>

      </head>
      <body style="--c-bg: #03D57E; --c-text: #000;">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
