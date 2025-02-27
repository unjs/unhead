import type { HeadTag } from '../../../src/types'
import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { renderDOMHead } from '../../../src/client'
import { createClientHeadWithContext, useDom } from '../../util'

describe('dom order', () => {
  it('renders in registered order', async () => {
    let firstTagRendered: HeadTag | null = null
    const head = createClientHeadWithContext({
      hooks: {
        'dom:rendered': ({ renders }) => {
          firstTagRendered = renders[0].tag
        },
      },
    })

    useHead(head, {
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
        "_p": 1024,
        "_w": 100,
        "props": {
          "class": Set {
            "no-js",
          },
        },
        "tag": "htmlAttrs",
      }
    `)
  })
})
