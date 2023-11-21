import { renderSSRHead } from '@unhead/ssr'

import { describe, it } from 'vitest'
import { createHead } from 'unhead'

describe('ssr templateParams', () => {
  it('basic', async () => {
    const head = createHead()
    head.push({
      htmlAttrs: {
        lang: '%locale',
      },
      title: 'hello world ":',
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
      script: [
        {
          type: 'application/json',
          innerHTML: JSON.stringify({
            title: '%s',
          }),
          processTemplateParams: true,
        },
      ],
      templateParams: {
        separator: '|',
        locale: 'en',
        siteName: 'My Awesome Site',
      },
    })
    const { headTags, htmlAttrs } = await renderSSRHead(head)

    expect(htmlAttrs).toMatchInlineSnapshot('" lang=\\"en\\""')
    expect(headTags).toMatchInlineSnapshot(`
      "<title>hello world \\\\&quot;: | My Awesome Site</title>
      <meta name=\\"description\\" content=\\"Welcome to My Awesome Site!\\">
      <meta property=\\"twitter:image\\" content=\\"https://cdn.example.com/some%20image.jpg\\">
      <script type=\\"application/json\\">{\\"title\\":\\"hello world \\\\\\":\\"}</script>"
    `)
  })

  it('does not affect other content', async () => {
    const head = createHead()
    head.push({
      title: 'This|is|an|example||with||multiple||||pipes',
      script: [
        {
          type: 'application/json',
          innerHTML: {
            title: '{"title":"This|is|an|example||with||multiple||||pipes"}',
          },
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)

    expect(headTags).toMatchInlineSnapshot(`
      "<title>This|is|an|example||with||multiple||||pipes</title>
      <script type=\\"application/json\\">{\\"title\\":\\"{\\\\\\"title\\\\\\":\\\\\\"This|is|an|example||with||multiple||||pipes\\\\\\"}\\"}</script>"
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
          processTemplateParams: true,
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)

    expect(headTags).toMatchInlineSnapshot(`
      "<title>Home &amp; &#x2F;&#x2F;&lt;&quot;With Encoding&quot;&gt;\\\\</title>
      <script type=\\"application/json\\">{\\"title\\":\\"Home & //\\\\u003C\\\\\\"With Encoding\\\\\\">\\\\\\"}</script>"
    `)
  })

  it('ssr payload', async () => {
    const head = createHead()
    head.push({
      title: 'test',
      titleTemplate: '%s %separator %siteName',
      templateParams: {
        separator: '|',
        siteName: 'My Awesome Site',
      },
    }, { mode: 'server' })
    const { headTags } = await renderSSRHead(head)

    expect(headTags).toMatchInlineSnapshot(`
      "<title>test | My Awesome Site</title>
      <script id=\\"unhead:payload\\" type=\\"application/json\\">{\\"title\\":\\"test\\",\\"titleTemplate\\":\\"%s %separator %siteName\\",\\"templateParams\\":{\\"separator\\":\\"|\\",\\"siteName\\":\\"My Awesome Site\\"}}</script>"
    `)
  })
})
