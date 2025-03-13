import { describe, it } from 'vitest'

import { TemplateParamsPlugin } from '../../../src/plugins'
import { renderSSRHead } from '../../../src/server'
import { createServerHeadWithContext } from '../../util'

describe('ssr templateParams', () => {
  it('payload merging', async () => {
    const head = createServerHeadWithContext({
      plugins: [TemplateParamsPlugin],
    })
    head.push({
      templateParams: {
        foo: 'bar',
      },
    }, {
      mode: 'server',
    })
    head.push({
      templateParams: {
        separator: 'x',
      },
    })
    const { headTags, htmlAttrs } = await renderSSRHead(head)

    expect(htmlAttrs).toMatchInlineSnapshot(`""`)
    expect(headTags).toMatchInlineSnapshot(`"<script id="unhead:payload" type="application/json">{"templateParams":{"foo":"bar"}}</script>"`)
  })

  it('basic', async () => {
    const head = createServerHeadWithContext({
      plugins: [TemplateParamsPlugin],
    })
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

    expect(htmlAttrs).toMatchInlineSnapshot(`" lang="en""`)
    expect(headTags).toMatchInlineSnapshot(`
      "<title>hello world &quot;: | My Awesome Site</title>
      <meta name="description" content="Welcome to My Awesome Site!">
      <meta property="twitter:image" content="https://cdn.example.com/some%20image.jpg">
      <script type="application/json">{"title":"hello world \\":"}</script>"
    `)
  })

  it('does not affect other content', async () => {
    const head = createServerHeadWithContext({
      plugins: [TemplateParamsPlugin],
    })
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
      <script type="application/json">{"title":"{\\"title\\":\\"This|is|an|example||with||multiple||||pipes\\"}"}</script>"
    `)
  })

  it('json', async () => {
    const head = createServerHeadWithContext({
      plugins: [TemplateParamsPlugin],
    })
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
      "<title>Home &amp; &#x2F;&#x2F;&lt;&quot;With Encoding&quot;&gt;\\</title>
      <script type="application/json">{"title":"Home & //\\u003C\\"With Encoding\\">\\\\"}</script>"
    `)
  })

  it('ssr payload', async () => {
    const head = createServerHeadWithContext({
      plugins: [
        TemplateParamsPlugin,
      ],
    })
    head.push({
      title: 'test',
      titleTemplate: '%s %separator %siteName',
      templateParams: {
        separator: '|',
        siteName: 'My Awesome Site',
      },
    }, { mode: 'server' })
    head.push({
      templateParams: {
        foo: 'bar',
      },
    }, { mode: 'server' })
    const { headTags } = await renderSSRHead(head)

    expect(headTags).toMatchInlineSnapshot(`
      "<title>test | My Awesome Site</title>
      <script id="unhead:payload" type="application/json">{"templateParams":{"separator":"|","siteName":"My Awesome Site","foo":"bar"},"title":"test","titleTemplate":"%s %separator %siteName"}</script>"
    `)
  })

  it('function titleTemplate with templateParams', async () => {
    const head = createServerHeadWithContext({
      plugins: [
        TemplateParamsPlugin,
      ],
    })
    head.push({
      titleTemplate: () => '%s %separator %subPage% %separator %site.name',
      title: 'test %foo',
      templateParams: {
        site: {
          name: 'test',
        },
        subPage: 'subPage',
        foo: 'foo',
      },
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `"<title>test foo | subPage% | test</title>"`,
    )
  })
})
