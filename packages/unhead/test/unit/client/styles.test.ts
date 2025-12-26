import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { activeDom, useDelayedSerializedDom, useDOMHead } from '../../util'

describe('styles', () => {
  it('basic', async () => {
    const head = useDOMHead()

    useHead(head, {
      htmlAttrs: {
        style: `--foo:bar`,
      },
    })!

    const el = useHead(head, {
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
    const head = useDOMHead()

    useHead(head, {
      bodyAttrs: {
        style: '--c-bg: #03D57E;--c-text: #000;',
      },
    })

    const el = useHead(head, {
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
