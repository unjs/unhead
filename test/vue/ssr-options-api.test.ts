import { ssrRenderOptionsHead } from './util'

describe('vue ssr options api', () => {
  test('server', async () => {
    const headResult = await ssrRenderOptionsHead({
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

    expect(headResult.headTags).toMatchInlineSnapshot(
      `
      "<title>hello</title>
      <meta name=\\"description\\" content=\\"desc\\" data-h-889faf=\\"\\">
      <meta property=\\"og:locale:alternate\\" content=\\"fr\\" data-h-2e94aa=\\"\\">
      <meta property=\\"og:locale:alternate\\" content=\\"zh\\" data-h-2e94aa=\\"\\">
      <script src=\\"foo.js\\" data-h-33493a=\\"\\"></script>"
    `,
    )
    expect(headResult.htmlAttrs).toEqual(' lang="zh"')
  })
})
