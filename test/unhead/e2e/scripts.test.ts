import {describe, it} from "vitest";
import {createHead, useHead} from "unhead";
import {renderSSRHead} from "@unhead/ssr";
import {useDom} from "../../fixtures";
import {renderDOMHead} from "@unhead/dom";

describe('unhead e2e scripts', () => {
  it('does not duplicate innerHTML', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
    const input = {
      script: [
        {
          innerHTML: 'console.log(\'Hello World\')',
        }
      ],
    }
    // i.e App.vue
    useHead(input)

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script>console.log('Hello World')</script>",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHead()
    csrHead.push(input)

    await renderDOMHead(csrHead, {document: dom.window.document})

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <script>console.log('Hello World')</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
