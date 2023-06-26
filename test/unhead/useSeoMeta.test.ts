import { createHead, useSeoMeta } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'
import { describe, it } from 'vitest'

describe('useSeoMeta', () => {
  it('themeColor', async () => {
    const head = createHead()

    useSeoMeta({
      themeColor: [
        { content: 'cyan', media: '(prefers-color-scheme: light)' },
        { content: 'black', media: '(prefers-color-scheme: dark)' },
      ],
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name=\\"theme-color\\" content=\\"cyan\\" media=\\"(prefers-color-scheme: light)\\">
      <meta name=\\"theme-color\\" content=\\"black\\" media=\\"(prefers-color-scheme: dark)\\">",
        "htmlAttrs": "",
      }
    `)
  })
})
