import { describe, it } from 'vitest'
import { createHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

describe('xss', () => {
  it('basic', async () => {
    const head = createHead()

    head.push({
      title: '</title><script>alert(1)</script>',
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>&lt;&#x2F;title&gt;&lt;script&gt;alert(1)&lt;&#x2F;script&gt;</title>
      <meta property=\\"unhead:ssr\\" content=\\"f2006d\\">",
        "htmlAttrs": "",
      }
    `)
  })
})
