import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { renderDOMHead } from '../../../src/client'
import { renderSSRHead } from '../../../src/server'
import { createClientHeadWithContext, useDom } from '../../util'

describe('unhead e2e data true', () => {
  it('truthy', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createClientHeadWithContext()
    // i.e App.vue
    useHead(ssrHead, {
      meta: [
        {
          'name': 'foo',
          'data-foo': 'true',
          'data-bar': 'false',
          'data-empty-string': '',
          'data-bar-false': false,
          'data-foo-true': true,
          'content': 'true',
        },
      ],
    })

    const data = renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="foo" data-foo="true" data-bar="false" data-empty-string="" data-bar-false="false" data-foo-true="true" content="true">",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createClientHeadWithContext()
    csrHead.push({
      meta: [
        {
          'name': 'foo',
          'data-foo': 'true',
          'content': 'true',
          'data-empty-string': '',
        },
      ],
    })

    renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <meta name="foo" data-foo="true" data-bar="false" data-empty-string="" data-bar-false="false" data-foo-true="true" content="true">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
