import { renderSSRHead } from '@unhead/ssr'

import { describe, it } from 'vitest'
import { createHead } from 'unhead'

describe('ssr templateParams', () => {
  it('basic', async () => {
    const head = createHead()
    head.push({
      title: 'hello world',
      titleTemplate: '%s %separator %siteName',
      meta: [
        {
          name: 'description',
          content: 'Welcome to %siteName!',
        },
        {
          property: 'twitter:image',
          content: 'https://cdn.example.com/some%20image.jpg',
        },
      ],
      templateParams: {
        separator: '|',
        siteName: 'My Awesome Site',
      },
    })
    const { headTags } = await renderSSRHead(head)

    expect(headTags).toMatchInlineSnapshot(`
      "<title>hello world | My Awesome Site</title>
      <meta name=\\"description\\" content=\\"Welcome to My Awesome Site!\\">
      <meta property=\\"twitter:image\\" content=\\"https://cdn.example.com/some%20image.jpg\\">"
    `)
  })

  it('json', async () => {
    const head = createHead()
    head.push({
      title: 'Home & //<"With Encoding">\\',
      script: [
        {
          type: 'application/json',
          innerHTML: {
            title: '%s',
          },
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)

    expect(headTags).toMatchInlineSnapshot(`
      "<title>Home &amp; &#x2F;&#x2F;&lt;&quot;With Encoding&quot;&gt;\\\\</title>
      <script type=\\"application/json\\">{\\"title\\":\\"Home & //<\\\\\\"With Encoding\\\\\\">\\\\\\\\\\"}</script>"
    `)
  })
})
