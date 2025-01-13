import { renderSSRHead } from '@unhead/ssr'
import { useHead, useSeoMeta } from '@unhead/vue'
import { it } from 'vitest'
import { ref } from 'vue'
import { basicSchema } from '../../../../unhead/test/fixtures'
import { ssrRenderHeadToString, ssrVueAppWithUnhead } from '../../util'

describe('vue ssr examples', () => {
  it('basic ref', async () => {
    const headResult = await ssrRenderHeadToString(() => {
      const lang = ref('de')

      useHead({
        ...basicSchema,
        htmlAttrs: {
          lang,
        },
      })
    })

    expect(headResult).toMatchInlineSnapshot(`
      {
        "bodyAttrs": " class="dark"",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset="utf-8">
      <script src="https://cdn.example.com/script.js"></script>
      <link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico">",
        "htmlAttrs": " lang="de"",
      }
    `)
  })

  it('misc example', async () => {
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        title: 'hello',
        htmlAttrs: {
          lang: 'zh',
        },
        meta: [
          {
            name: 'description',
            content: 'desc',
          },
          {
            property: 'og:locale:alternate',
            content: ['fr', 'zh'],
          },
        ],
        script: [
          {
            src: 'foo.js',
          },
        ],
      })
      useHead({
        meta: [
          {
            name: 'description',
            content: 'desc 2',
          },
        ],
      })
    })

    expect(headResult.headTags).toMatchInlineSnapshot(`
      "<title>hello</title>
      <script src="foo.js"></script>
      <meta property="og:locale:alternate" content="fr">
      <meta property="og:locale:alternate" content="zh">
      <meta name="description" content="desc 2">"
    `)
    expect(headResult.htmlAttrs).toEqual(' lang="zh"')
  })

  it('#issue 138', async () => {
    const headResult = await ssrRenderHeadToString(() =>
      useHead({
        link: [
          {
            href: '/',
          },
          ...[].map(() => ({
            rel: 'prefetch',
            href: '',
          })), // this damages the type inference
          { rel: 'icon', type: 'image/svg', href: '/favicon.svg' },
        ],
      }))

    expect(headResult.headTags).toMatchInlineSnapshot(
      `
      "<link href="/">
      <link rel="icon" type="image/svg" href="/favicon.svg">"
    `,
    )
  })

  it('non-strings', async () => {
    const headResult = await ssrRenderHeadToString(() => useHead({
      htmlAttrs: {
        'data-something': true,
      },
    }))

    expect(headResult.htmlAttrs).toMatchInlineSnapshot(
      `" data-something="true""`,
    )
  })

  it('useSeoMeta', async () => {
    const head = await ssrVueAppWithUnhead(() => {
      const data = ref<null | { title: string, description: string }>(null)

      useSeoMeta({
        title: () => data.value?.title || 'Page',
        titleTemplate: title => `${title} - My Site`,
        ogTitle: () => `${data.value?.title} - My Site`,
        description: () => data.value?.description,
        ogDescription: () => data.value?.description,
        ogImage: () => [
          { url: 'https://example.com/image.jpg' },
          { url: 'https://example.com/image2.jpg' },
        ],
      })

      data.value = {
        title: 'page name',
        description: 'my page description',
      }
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>page name - My Site</title>
      <meta property="og:image" content="https://example.com/image.jpg">
      <meta property="og:image" content="https://example.com/image2.jpg">
      <meta property="og:title" content="page name - My Site">
      <meta name="description" content="my page description">
      <meta property="og:description" content="my page description">",
        "htmlAttrs": "",
      }
    `)
  })
})
