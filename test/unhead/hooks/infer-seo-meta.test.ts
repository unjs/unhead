import { describe, it } from 'vitest'
import { InferSeoMetaPlugin } from '@unhead/addons'
import { useDOMHead, useDelayedSerializedDom } from '../dom/util'

describe('hooks', () => {
  it('infer-seo-meta', async () => {
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

      <title>Hello World</title><meta name="description" content="description"><meta property="og:title" content="Hello World"><meta property="og:description" content="description"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('infer-seo-meta multiple titleTemplates', async () => {
    const head = useDOMHead({
      plugins: [
        InferSeoMetaPlugin(),
      ],
    })

    head.push({
      titleTemplate: {
        textContent: '%s | 1',
        tagPriority: 50,
      },
      title: 'Hello World',
      meta: [
        { name: 'description', content: 'description' },
      ],
    })

    head.push({
      titleTemplate: '%s | 2',
      title: 'Hello World',
      meta: [
        { name: 'description', content: 'description' },
      ],
    }, {
      tagPriority: -5,
    })

    head.push({
      titleTemplate: '%s | 3',
      title: 'Hello World',
      meta: [
        { name: 'description', content: 'description' },
      ],
    }, {
      tagPriority: 103,
    })
    const dom = await useDelayedSerializedDom()
    const title = dom.match(/<title>Hello World \| (\d)<\/title>/)?.[1]
    const ogTitle = dom.match(/<meta property="og:title" content="Hello World \| (\d)">/)?.[1]
    expect(title).toEqual(ogTitle)
    expect(title).toEqual(`2`)
  })
})
