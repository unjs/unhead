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
        "headTags": "<script async fetchpriority=\\"low\\" src=\\"https://cdn.example.com/script.js\\" onload=\\"this.dataset.onload = true\\" onerror=\\"this.dataset.onerror = true\\" onabort=\\"this.dataset.onabort = true\\" onprogress=\\"this.dataset.onprogress = true\\" onloadstart=\\"this.dataset.onloadstart = true\\" data-hid=\\"438d65b\\"></script>",
        "htmlAttrs": "",
      }
    `)
  })
})
