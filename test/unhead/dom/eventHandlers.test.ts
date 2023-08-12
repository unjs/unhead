import { describe, it } from 'vitest'
import { useHead } from 'unhead'
import { useDOMHead, useDelayedSerializedDom } from './util'

describe('dom event handlers', () => {
  it('basic', async () => {
    useDOMHead()

    useHead({
      script: [
        {
          src: 'https://js.stripe.com/v3/',
          defer: true,
          // eslint-disable-next-line no-console
          onload: () => console.log('loaded stripe'),
        },
      ],
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <script src=\\"https://js.stripe.com/v3/\\" defer=\\"\\" data-h-load=\\"\\"></script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
