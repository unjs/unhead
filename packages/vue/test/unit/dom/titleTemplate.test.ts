// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { useHead } from '@unhead/vue'
import { describe } from 'vitest'
import { useDom } from '../../../../unhead/test/fixtures'
import { csrVueAppWithUnhead } from '../../util'

describe('vue dom titleTemplate', () => {
  it('fn replace', async () => {
    const dom = useDom()
    const head = csrVueAppWithUnhead(dom, () => {}, {
      init: [
        {
          titleTemplate: () => 'Test',
        },
      ],
    })

    renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.title).toMatchInlineSnapshot(
      `""`,
    )
  })

  it('basic', async () => {
    const dom = useDom()
    const head = csrVueAppWithUnhead(dom, () => {
      useHead({
        title: 'test',
        titleTemplate: '%s | template',
      })
    })

    renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })

  it('remove', async () => {
    const dom = useDom()
    let entry
    const head = csrVueAppWithUnhead(dom, () => {
      entry = useHead({
        title: 'test',
      })
    }, {
    })

    renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.title).toMatchInlineSnapshot(
      `""`,
    )

    entry!.dispose()

    renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.title).toMatchInlineSnapshot(
      `""`,
    )
  })
})
