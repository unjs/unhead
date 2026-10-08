import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { renderDOMHead } from '../../../src/client'
import { renderSSRHead } from '../../../src/server'
import { createClientHeadWithContext, createServerHeadWithContext, useDom } from '../../util'

describe('unhead e2e textContent', () => {
  it('pretend json', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createClientHeadWithContext()
    // i.e App.vue
    useHead(ssrHead, {
      style: [
        {
          textContent: '.test { color: red; }',
        },
      ],
    })

    const data = renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<style>.test { color: red; }</style>",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createClientHeadWithContext()
    csrHead.push({
      style: [
        {
          textContent: '.test { color: red; }',
        },
      ],
    })

    renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <style>.test { color: red; }</style>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('renders meta tags with a non-string textContent (#1006)', async () => {
    for (const textContent of [1, true]) {
      const head = createServerHeadWithContext({ disableDefaults: true })
      head.push({
        meta: [
          { content: 'c', textContent } as any,
          { content: 'd', textContent } as any,
        ],
      })
      expect((await renderSSRHead(head)).headTags).toBe('<meta content="d">')
    }
  })
})
