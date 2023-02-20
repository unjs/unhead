import { describe, it } from 'vitest'
import { createHead, useHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'

describe('unhead e2e textContent', () => {
  it('pretend json', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
    // i.e App.vue
    useHead({
      style: [
        {
          textContent: '.test { color: red; }',
        },
      ],
    })

    const data = await renderSSRHead(ssrHead)

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

    const csrHead = createHead()
    csrHead.push({
      style: [
        {
          textContent: '.test { color: red; }',
        },
      ],
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <style>.test { color: red; }</style>
      <style>.test { color: red; }</style></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
