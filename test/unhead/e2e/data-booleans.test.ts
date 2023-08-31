import { describe, it } from 'vitest'
import { createHead, useServerHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'

describe('unhead e2e data true', () => {
  it('truthy', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
    // i.e App.vue
    useServerHead({
      meta: [
        {
          'name': 'foo',
          'data-foo': 'true',
          'data-bar': 'false',
          'data-bar-false': false,
          'data-foo-true': true,
          'content': 'true',
        },
      ],
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name=\\"foo\\" data-foo=\\"true\\" data-bar=\\"false\\" data-bar-false=\\"false\\" data-foo-true=\\"true\\" content>",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHead()
    csrHead.push({
      meta: [
        {
          'name': 'foo',
          'data-foo': 'true',
          'content': 'true',
        },
      ],
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <meta name=\\"foo\\" data-foo=\\"true\\" data-bar=\\"false\\" data-bar-false=\\"false\\" data-foo-true=\\"true\\" content=\\"\\">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
