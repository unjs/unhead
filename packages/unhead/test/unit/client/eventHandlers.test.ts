import { describe, expect, it } from 'vitest'
import { useHead } from '../../../src'
import { useDelayedSerializedDom, useDOMHead } from '../../util'

describe('dom event handlers', () => {
  it('basic', async () => {
    const head = useDOMHead()

    useHead(head, {
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

      <script src="https://js.stripe.com/v3/" defer="" data-onload=""></script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
