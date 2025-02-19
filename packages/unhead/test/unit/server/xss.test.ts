import { stringify } from 'devalue'
import { renderSSRHead } from 'unhead/server'
import { describe, it } from 'vitest'
import { createServerHeadWithContext } from '../../util'

describe('xss', () => {
  it('basic', async () => {
    const head = createServerHeadWithContext()

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
    const head = createServerHeadWithContext()

    head.push({
      script: [
        { innerHTML: stringify({ state1: '</scr' + 'ipt>' }) },
      ],
    })

    head.push({
      script: [
        { type: 'application/json', innerHTML: stringify({ state2: '</scr' + 'ipt>' }) },
      ],
    })
    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script>[{"state1":1},"\\u003C/script>"]</script>
      <script type="application/json">[{"state2":1},"\\u003C/script>"]</script>",
        "htmlAttrs": "",
      }
    `)
  })
  it('title quotes', async () => {
    const head = createServerHeadWithContext()

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
