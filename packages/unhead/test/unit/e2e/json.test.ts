import { renderDOMHead } from '@unhead/dom'
import { renderSSRHead } from '@unhead/ssr'
import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { createClientHeadWithContext, useDom } from '../../util'

describe('unhead e2e json', () => {
  it('valid object json', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createClientHeadWithContext()
    // i.e App.vue
    useHead(ssrHead, {
      script: [
        {
          type: 'application/json',
          innerHTML: {
            foo: 'bar',
          },
        },
      ],
    })

    const data = renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script type="application/json">{"foo":"bar"}</script>",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createClientHeadWithContext()
    csrHead.push({
      script: [
        {
          type: 'application/json',
          innerHTML: {
            foo: 'bar',
          },
        },
      ],
    })

    renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <script type="application/json">{"foo":"bar"}</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
