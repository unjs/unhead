import { describe } from 'vitest'
import { createHead, setHeadInjectionHandler, useHead } from '@unhead/vue'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'

describe('vue dom titleTemplate', () => {
  test('basic', async () => {
    const dom = useDom()
    const head = createHead()
    setHeadInjectionHandler(() => head)

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
