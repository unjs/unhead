import { describe, it } from 'vitest'
import { createHead, useHead, useHtmlAttrs } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'
import { basicSchema } from '../../fixtures'

describe('composables', () => {
  it('basic', async () => {
    const head = createHead({
    })

    useHead(basicSchema)

    useHead({
      htmlAttrs: {
        lang: 'en',
      },
    })

    useHtmlAttrs({
      lang: 'de',
      dir: 'ltr',
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": " class=\\"dark\\"",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset=\\"utf-8\\">
      <script src=\\"https://cdn.example.com/script.js\\"></script>
      <link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\">",
        "htmlAttrs": " lang=\\"de\\" dir=\\"ltr\\"",
      }
    `)
  })
})
