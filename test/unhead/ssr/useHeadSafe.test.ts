import { describe, it } from 'vitest'
import { createHead, useHeadSafe } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'
import { basicSchema } from '../../fixtures'

describe('dom useHeadSafe', () => {
  it('basic', async () => {
    const head = createHead()

    useHeadSafe(basicSchema)

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": " class=\\"dark\\"",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset=\\"utf-8\\">
      <link href=\\"https://cdn.example.com/favicon.ico\\" rel=\\"icon\\" type=\\"image/x-icon\\">",
        "htmlAttrs": " lang=\\"en\\" dir=\\"ltr\\"",
      }
    `)
  })

  it('link href', async () => {
    const head = createHead()

    useHeadSafe({
      link: [
        // relative from root
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/icon.png',
        },
        // relative to path
        {
          rel: 'icon',
          href: 'favicon.ico',
        },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<link href=\\"/icon.png\\" rel=\\"apple-touch-icon\\" sizes=\\"180x180\\">
      <link href=\\"favicon.ico\\" rel=\\"icon\\">",
        "htmlAttrs": "",
      }
    `)
  })
})
