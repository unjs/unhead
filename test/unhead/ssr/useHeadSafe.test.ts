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
})
