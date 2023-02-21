import { describe, it } from 'vitest'
import { ref } from 'vue'
import { useHead, useHtmlAttrs, useTagMeta, useTagMetaFlat, useTagScript } from '@unhead/vue'
import { ssrRenderHeadToString } from '../util'

describe('vue ssr composables', () => {
  it('basic', async () => {
    const headResult = await ssrRenderHeadToString(() => {
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
    })

    expect(headResult).toMatchInlineSnapshot(`
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
    const headResult = await ssrRenderHeadToString(() => {
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
    })

    expect(headResult).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset=\\"utf-8\\">
      <script src=\\"https://cdn.example.com/script.js\\" defer=\\"\\"></script>
      <meta name=\\"description\\" content=\\"my description\\">",
        "htmlAttrs": "",
      }
    `)
  })
})
