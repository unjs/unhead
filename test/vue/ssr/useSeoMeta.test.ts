import { createHead, useSeoMeta } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'
import { describe, it } from 'vitest'

describe('useSeoMeta vue ssr', () => {
  it('ssr reactivity', async () => {
    const head = createHead()
    const data = {
      value: 'foo'
    }
    useSeoMeta({
      robots: () => data.value,
    })
    data.value = 'bar'
    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name=\\"robots\\" content=\\"bar\\">",
        "htmlAttrs": "",
      }
    `)
  })
})
