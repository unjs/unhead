import { describe, it } from 'vitest'
import { ref } from 'vue'
import { renderSSRHead } from '@unhead/ssr'
import { createHead, useHead, useHtmlAttrs, useTagMeta, useTagMetaFlat, useTagScript } from '@unhead/vue'

describe('vue composables', () => {
  it('basic', async () => {
    const head = createHead()
    const lang = ref('en')

    useHead({
      htmlAttrs: {
        lang,
      },
    })

    lang.value = 'de'

    useHtmlAttrs({
      lang,
      dir: 'ltr',
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "",
        "htmlAttrs": " lang=\\"de\\" dir=\\"ltr\\"",
      }
    `)
  })

  it('shortcuts', async () => {
    const head = createHead()

    useTagScript({
      src: 'https://cdn.example.com/script.js',
      defer: true,
    })

    useTagMeta({
      charset: 'utf-8',
    })

    const desc = ref('my description')
    useTagMetaFlat({
      description: desc,
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset=\\"utf-8\\" data-h-207e30=\\"\\">
      <script src=\\"https://cdn.example.com/script.js\\" defer=\\"\\" data-h-71dd33=\\"\\"></script>
      <meta name=\\"description\\" content=\\"my description\\" data-h-889faf=\\"\\">",
        "htmlAttrs": "",
      }
    `)
  })
})
