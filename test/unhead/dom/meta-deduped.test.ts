import { describe, it } from 'vitest'
import { HydrateStateFromSSRPlugin, createHead, getActiveHead, useHead } from 'unhead'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'

describe('dom meta-deduped', () => {
  it('renders both', async () => {
    await createHead({
      plugins: [HydrateStateFromSSRPlugin()],
    })

    useHead({
      meta: [
        {
          property: 'og:image',
          content: [
            'https://cdn.example.com/1.jpg',
            'https://cdn.example.com/2.jpg',
          ],
        },
      ],
    })

    const head = getActiveHead()

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/1.jpg\\"><meta property=\\"og:image\\" content=\\"https://cdn.example.com/2.jpg\\"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('can update', async () => {
    const head = createHead({
      plugins: [HydrateStateFromSSRPlugin()],
    })

    const entry = head.push({
      meta: [
        {
          property: 'og:image',
          content: [
            'https://cdn.example.com/1.jpg',
          ],
        },
      ],
    })

    entry.patch({
      meta: [
        {
          property: 'og:image',
          content: [
            'https://cdn.example.com/1.jpg',
            'https://cdn.example.com/2.jpg',
            'https://cdn.example.com/3.jpg',
          ],
        },
      ],
    })

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/1.jpg\\"><meta property=\\"og:image\\" content=\\"https://cdn.example.com/2.jpg\\"><meta property=\\"og:image\\" content=\\"https://cdn.example.com/3.jpg\\"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
