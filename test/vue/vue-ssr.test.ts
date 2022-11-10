import { createSSRApp, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createHead, useHead } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'
import { ssrRenderHeadToString } from './util'

describe('vue ssr', () => {
  test('server', async () => {
    const headResult = await ssrRenderHeadToString(() => useHead({
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
          name: 'description',
          content: 'desc 2',
        },
        {
          property: 'og:locale:alternate',
          content: 'fr',
          key: 'fr',
        },
        {
          property: 'og:locale:alternate',
          content: 'zh',
          key: 'zh',
        },
      ],
      script: [
        {
          src: 'foo.js',
        },
      ],
    }))

    expect(headResult.headTags).toMatchInlineSnapshot(
      `
      "<title>hello</title>
      <meta name=\\"description\\" content=\\"desc\\" data-h-889faf=\\"\\">
      <meta name=\\"description\\" content=\\"desc 2\\" data-h-889faf3=\\"\\">
      <meta property=\\"og:locale:alternate\\" content=\\"fr\\" data-h-3f7248=\\"\\">
      <meta property=\\"og:locale:alternate\\" content=\\"zh\\" data-h-321fb4=\\"\\">
      <script src=\\"foo.js\\" data-h-ed7ece=\\"\\"></script>"
    `,
    )
    expect(headResult.htmlAttrs).toEqual(' lang="zh"')
  })

  test('useHead: server async setup', async () => {
    const head = createHead()
    const app = createSSRApp({
      async setup() {
        const title = ref('initial title')
        useHead({
          title,
        })
        await new Promise(resolve => setTimeout(resolve, 200))
        title.value = 'new title'
        return () => '<div>hi</div>'
      },
    })
    app.use(head)
    await renderToString(app)

    const { headTags } = await renderSSRHead(head)
    expect(headTags).eq('<title>new title</title>')
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
      '"<script data-h-2abb7d=\\"\\">console.log(\'hi\')</script>"',
    )
  })

  test('script key', async () => {
    const headResult = await ssrRenderHeadToString(() =>
      useHead({
        script: [
          {
            src: 'test',
            key: 'my-script',
            innerHTML: 'console.log(\'A\')',
          },
          {
            key: 'my-script',
            innerHTML: 'console.log(\'B\')',
          },
        ],
      }),
    )

    expect(headResult.headTags).toMatchInlineSnapshot(
      `
      "<script src=\\"test\\" data-h-229264=\\"\\">console.log('A')</script>
      <script data-h-2292641=\\"\\">console.log('B')</script>"
    `,
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
      "<link href=\\"/\\" data-h-877ffb=\\"\\">
      <link rel=\\"icon\\" type=\\"image/svg\\" href=\\"/favicon.svg\\" data-h-ce747c=\\"\\">"
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
