// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { useHead } from '@unhead/vue'
import { describe } from 'vitest'
import { useDom } from '../../../../test/fixtures'
import { csrVueAppWithUnhead } from '../util'

describe('vue dom titleTemplate', () => {
  it('basic', async () => {
    const dom = useDom()
    const head = csrVueAppWithUnhead(dom, () => {
      useHead({
        title: 'test',
        titleTemplate: '%s | template',
      })
    })

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      <title>test | template</title></head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })
})
