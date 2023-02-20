import { describe, it } from 'vitest'
import { renderDOMHead } from '@unhead/dom'
import { InferSeoMetaPlugin } from '@unhead/addons'
import { activeDom, useDOMHead, useDelayedSerializedDom } from '../dom/util'

describe('hooks', () => {
  it('delay dom', async () => {
    const head = useDOMHead({
      hooks: InferSeoMetaPlugin().hooks,
    })

    head.push({
      title: 'Hello World',
      meta: [
        { name: 'description', content: 'description' },
      ],
    })
    // even try a force render
    await renderDOMHead(head, { document: activeDom!.window.document })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <title>Hello World</title><meta name=\\"description\\" content=\\"description\\"><meta property=\\"og:title\\" content=\\"Hello World\\"><meta name=\\"og:description\\" content=\\"description\\"><meta name=\\"robots\\" content=\\"max-snippet: -1; max-image-preview: large; max-video-preview: -1\\"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
