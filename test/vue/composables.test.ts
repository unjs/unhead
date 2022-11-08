import { describe, it } from 'vitest'
import { ref } from 'vue'
import { renderSSRHead } from '@unhead/ssr'
import { createHead, useHead, useHtmlAttrs, useMeta, useScript } from '@unhead/vue'

describe('vue composables', () => {
  it('basic', async () => {
    const head = await createHead()
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
    const head = await createHead()

    useScript({
      src: 'https://cdn.example.com/script.js',
      defer: true,
    })

    useMeta({
      charset: 'utf-8',
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset=\\"utf-8\\" data-h-207e30=\\"\\">
      <script src=\\"https://cdn.example.com/script.js\\" defer=\\"\\" data-h-46d5e8=\\"\\"></script>",
        "htmlAttrs": "",
      }
    `)
  })
})
