import type { HeadTag } from '@unhead/schema'
import { renderDOMHead } from '@unhead/dom'
import { useHead } from 'unhead'
import { describe, it } from 'vitest'
import { useDom } from '../../fixtures'
import { createHeadWithContext } from '../../util'

describe('dom order', () => {
  it('renders in registered order', async () => {
    let firstTagRendered: HeadTag | null = null
    const head = createHeadWithContext({
      hooks: {
        'dom:rendered': ({ renders }) => {
          firstTagRendered = renders[0].tag
        },
      },
    })

    useHead({
      htmlAttrs: {
        class: 'no-js',
      },
      script: [{ children: 'document.documentElement.classList.remove("no-js")' }],
    })

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(firstTagRendered).toMatchInlineSnapshot(`
      {
        "_d": "htmlAttrs",
        "_e": 0,
        "_p": 0,
        "props": {
          "class": "no-js",
        },
        "tag": "htmlAttrs",
      }
    `)
  })
})
