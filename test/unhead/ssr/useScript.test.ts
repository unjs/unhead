import { describe, it } from 'vitest'
import { createHead, useScript } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

describe('dom useScript', () => {
  it('basic', async () => {
    const head = createHead()

    useScript({
      src: 'https://cdn.example.com/script.js',
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script src=\\"https://cdn.example.com/script.js\\" data-hid=\\"438d65b\\"></script>",
        "htmlAttrs": "",
      }
    `)
  })
})
