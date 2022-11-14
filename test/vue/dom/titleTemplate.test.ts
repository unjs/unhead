import { describe } from 'vitest'
import { createHead, useHead } from '@unhead/vue'
import { useDom } from '../../fixtures'
import { renderDOMHead } from '@unhead/dom'

describe('vue dom titleTemplate', () => {
  test('basic', async () => {
    const dom = useDom()

    const head = createHead()

    useHead({
      title: 'test',
      titleTemplate: '%s | template',
    })

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <title>test | template</title></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
