import { describe, it } from 'vitest'
import { createHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

describe('xss', () => {
  it('basic', async () => {
    const head = createHead()

    head.push({
      title: '</title><script>alert(1)</script>',
    })


    head.push({
      style: [
        {
          children: '</style><script>alert(1)</script>',
        }
      ]
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>&#60;/title&#62;&#60;script&#62;alert(1)&#60;/script&#62;</title>
      <style></style><script>alert(1)</script></style>",
        "htmlAttrs": "",
      }
    `)
  })
})
