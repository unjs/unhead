import { ssrRenderOptionsHead } from '../util'

describe('vue ssr options api', () => {
  it('server', async () => {
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
      <meta name=\\"description\\" content=\\"desc\\">
      <meta property=\\"og:locale:alternate\\" content=\\"fr\\">
      <meta property=\\"og:locale:alternate\\" content=\\"zh\\">
      <script src=\\"foo.js\\"></script>"
    `,
    )
    expect(headResult.htmlAttrs).toEqual(' lang="zh"')
  })
})
