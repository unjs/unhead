import { useHead } from 'unhead'
import { describe, it } from 'vitest'
import { useDelayedSerializedDom, useDOMHead } from './util'

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

      <script data-onload="" src="https://js.stripe.com/v3/" defer=""></script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
