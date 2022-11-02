import { it } from 'vitest'
import { ref } from 'vue'
import { createHead, useHead } from '../../packages/vue/src'
import { basicSchema } from '../fixtures'
import { renderSSRHead } from '../../packages/unhead/src/runtime/server'
import { ssrRenderHeadToString } from './util'

describe('vue ssr', () => {
  it('basic', async () => {
    const head = createHead()

    const lang = ref('de')

    head.push({
      ...basicSchema,
      htmlAttrs: {
        lang,
      },
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": " class=\\"dark\\"",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset=\\"utf-8\\" data-h-207e30=\\"\\">
      <script src=\\"https://cdn.example.com/script.js\\" data-h-4bccad=\\"\\"></script>
      <link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\" data-h-533738=\\"\\">",
        "htmlAttrs": " lang=\\"de\\"",
      }
    `)
  })

  test('server', async () => {
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
      <meta name=\\"description\\" content=\\"desc 2\\" data-h-889faf=\\"\\">
      <meta property=\\"og:locale:alternate\\" content=\\"fr\\" data-h-2e94aa=\\"\\">
      <meta property=\\"og:locale:alternate\\" content=\\"zh\\" data-h-2e94aa=\\"\\">
      <script src=\\"foo.js\\" data-h-33493a=\\"\\"></script>"
    `,
    )
    expect(headResult.htmlAttrs).toEqual(' lang="zh"')
  })

  test('children', async () => {
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        script: [
          {
            innerHTML: 'console.log(\'hi\')',
          },
        ],
      })
    })

    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<script data-h-4d4fad=\\"\\">console.log(\'hi\')</script>"',
    )
  })

  test('script key', async () => {
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        script: [
          {
            src: 'test',
            key: 'my-script',
            innerHTML: 'console.log(\'A\')',
          },
        ],
      })
      useHead({
        script: [
          {
            key: 'my-script',
            innerHTML: 'console.log(\'B\')',
          },
        ],
      })
    },
    )

    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<script data-h-229264=\\"\\">console.log(\'B\')</script>"',
    )
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
      "<link href=\\"/\\" data-h-deed27=\\"\\">
      <link rel=\\"icon\\" type=\\"image/svg\\" href=\\"/favicon.svg\\" data-h-6f3633=\\"\\">"
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
