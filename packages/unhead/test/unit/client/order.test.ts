import type { HeadTag } from '../../../src/types'
import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { createClientHeadWithContext, useDom } from '../../util'

describe('dom order', () => {
  it('renders in registered order', async () => {
    const dom = useDom()
    let firstTagRendered: HeadTag | null = null
    const head = createClientHeadWithContext({
      document: dom.window.document,
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
      script: [{ innerHTML: 'document.documentElement.classList.remove("no-js")' }],
    })

    // Wait for auto-render
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(firstTagRendered).toMatchInlineSnapshot(`
      {
        "_d": "script:content:document.documentElement.classList.remove("no-js")",
        "_p": 1025,
        "_w": 50,
        "innerHTML": "document.documentElement.classList.remove("no-js")",
        "props": {},
        "tag": "script",
      }
    `)
  })
})
