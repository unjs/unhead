import { describe, it } from 'vitest'
import { InferSeoMetaPlugin } from '@unhead/addons'
import { useDOMHead, useDelayedSerializedDom } from '../dom/util'

describe('hooks', () => {
  it('delay dom', async () => {
    const head = useDOMHead({
      plugins: [
        InferSeoMetaPlugin(),
      ],
    })

    head.push({
      title: 'Hello World',
      meta: [
        { name: 'description', content: 'description' },
      ],
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <title>Hello World</title><meta name=\\"description\\" content=\\"description\\"><meta property=\\"og:title\\" content=\\"Hello World\\"><meta property=\\"og:description\\" content=\\"description\\"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
