import { it } from 'vitest'
import { ref } from 'vue'
import { useHead } from '@unhead/vue'
import { basicSchema } from '../../fixtures'
import { ssrRenderHeadToString } from '../util'

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
        "bodyAttrs": " class=\\"dark\\"",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset=\\"utf-8\\">
      <script src=\\"https://cdn.example.com/script.js\\"></script>
      <link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\">",
        "htmlAttrs": " lang=\\"de\\"",
      }
    `)
  })

  test('misc example', async () => {
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

    expect(headResult.headTags).toMatchInlineSnapshot(
      `
      "<title>hello</title>
      <meta property=\\"og:locale:alternate\\" content=\\"fr\\" data-h-19f4e5=\\"\\">
      <meta property=\\"og:locale:alternate\\" content=\\"zh\\" data-h-21080c=\\"\\">
      <script src=\\"foo.js\\"></script>
      <meta name=\\"description\\" content=\\"desc 2\\">"
    `,
    )
    expect(headResult.htmlAttrs).toEqual(' lang="zh"')
  })

  test('#issue 138', async () => {
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
      }),
    )

    expect(headResult.headTags).toMatchInlineSnapshot(
      `
      "<link href=\\"/\\">
      <link rel=\\"icon\\" type=\\"image/svg\\" href=\\"/favicon.svg\\">"
    `,
    )
  })

  test('non-strings', async () => {
    const headResult = await ssrRenderHeadToString(() => useHead({
      htmlAttrs: {
        'data-something': true,
      },
    }))

    expect(headResult.htmlAttrs).toMatchInlineSnapshot(
      '" data-something=\\"\\""',
    )
  })
})
