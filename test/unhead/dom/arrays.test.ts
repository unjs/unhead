import { useHead } from 'unhead'
import { describe, it } from 'vitest'
import { useDelayedSerializedDom, useDOMHead } from './util'

describe('arrays', () => {
  it('basic', async () => {
    useDOMHead()

    useHead({
      meta: [
        {
          property: 'og:image',
          content: [
            'https://cdn.example.com/image1.jpg',
            'https://cdn.example.com/image2.jpg',
          ],
        },
      ],
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <meta property="og:image" content="https://cdn.example.com/image1.jpg"><meta property="og:image" content="https://cdn.example.com/image2.jpg"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('override', async () => {
    useDOMHead()

    useHead({
      meta: [
        {
          property: 'og:image',
          content: [
            'https://cdn.example.com/image1.jpg',
            'https://cdn.example.com/image2.jpg',
          ],
        },
      ],
    })

    useHead({
      meta: [
        {
          property: 'og:image',
          content: 'https://cdn.example.com/new.jpg',
        },
      ],
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <meta property="og:image" content="https://cdn.example.com/new.jpg"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
