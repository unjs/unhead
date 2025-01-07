import { renderSSRHead } from '@unhead/ssr'
import { stringify } from 'devalue'
import { describe, it } from 'vitest'
import { createHeadWithContext } from '../../util'

describe('xss', () => {
  it('basic', async () => {
    const head = createHeadWithContext()

    head.push({
      title: '</title><script>alert(1)</script>',
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>&lt;&#x2F;title&gt;&lt;script&gt;alert(1)&lt;&#x2F;script&gt;</title>",
        "htmlAttrs": "",
      }
    `)
  })
  it('json devalue', async () => {
    const head = createHeadWithContext()

    head.push({
      script: [
        { innerHTML: stringify({ state: '</scr' + 'ipt>' }) },
      ],
    })

    head.push({
      script: [
        { type: 'application/json', innerHTML: stringify({ state: '</scr' + 'ipt>' }) },
      ],
    })
    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script>[{"state":1},"\\u003C/script>"]</script>
      <script type="application/json">[{"state":1},"\\u003C/script>"]</script>",
        "htmlAttrs": "",
      }
    `)
  })
  it('title quotes', async () => {
    const head = createHeadWithContext()

    head.push({
      title: '"test" times',
      titleTemplate: '%s - myApp',
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>&quot;test&quot; times - myApp</title>",
        "htmlAttrs": "",
      }
    `)
  })
})
