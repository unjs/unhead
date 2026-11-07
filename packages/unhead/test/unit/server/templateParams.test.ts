import type { Script } from '../../../src/types'
import { describe, it } from 'vitest'

import { TemplateParamsPlugin } from '../../../src/plugins'
import { renderSSRHead } from '../../../src/server'
import { processTemplateParams } from '../../../src/utils'
import { createServerHeadWithContext } from '../../util'

describe('ssr templateParams', () => {
  for (const type of ['application/json', 'application/ld+json'] as const) {
    it.each(Array.from({ length: 32 }, (_, code) => code))(`escapes control character %i in ${type} template parameters`, (code) => {
      const value = `before${String.fromCharCode(code)}after"\\</script>`
      const head = createServerHeadWithContext({ plugins: [TemplateParamsPlugin] })
      const script: Script = {
        type,
        innerHTML: { value: '%value' },
      }
      head.push({
        script: [{ ...script, processTemplateParams: true }],
        templateParams: { value },
      })

      const { headTags } = renderSSRHead(head)
      const json = headTags.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1]

      expect(json).toBeDefined()
      expect(JSON.parse(json!)).toEqual({ value })
      expect(json).not.toContain('</script>')
    })
  }

  it('preserves control characters in plain-text template parameters', () => {
    expect(processTemplateParams('Before %value after', { value: 'line1\nline2' }))
      .toBe('Before line1\nline2 after')
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
    const { headTags, htmlAttrs } = renderSSRHead(head)

    expect(htmlAttrs).toMatchInlineSnapshot(`" lang="en""`)
    expect(headTags).toMatchInlineSnapshot(`
      "<title>hello world &quot;: | My Awesome Site</title>
      <meta name="description" content="Welcome to My Awesome Site!">
      <meta property="twitter:image" content="https://cdn.example.com/some%20image.jpg">
      <script type="application/json">{"title":"hello world \\":"}</script>"
    `)
  })

  it('script with processTemplateParams and no type does not throw', async () => {
    const head = createServerHeadWithContext({
      plugins: [TemplateParamsPlugin],
    })
    head.push({
      title: 'My Site',
      script: [
        {
          innerHTML: 'console.log("%s")',
          processTemplateParams: true,
        },
      ],
      templateParams: {
        s: 'My Site',
      },
    })
    const { headTags } = renderSSRHead(head)

    expect(headTags).toContain('<script>console.log("My Site")</script>')
    expect(headTags).not.toContain('%s')
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
    const { headTags } = renderSSRHead(head)

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
    const { headTags } = renderSSRHead(head)

    expect(headTags).toMatchInlineSnapshot(`
      "<title>Home &amp; &#x2F;&#x2F;&lt;&quot;With Encoding&quot;&gt;\\</title>
      <script type="application/json">{"title":"Home & //\\u003C\\"With Encoding\\">\\\\"}</script>"
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
    const { headTags } = renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `"<title>test foo | subPage% | test</title>"`,
    )
  })

  it('numeric params, including 0', async () => {
    const head = createServerHeadWithContext({
      plugins: [TemplateParamsPlugin],
    })
    head.push({
      title: '%count items',
      meta: [
        {
          name: 'description',
          content: '%count items from %price',
        },
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: '{"price":"%price","count":"%count"}',
          processTemplateParams: true,
        },
      ],
      templateParams: {
        count: 0,
        price: 5,
      },
    })
    const { headTags } = renderSSRHead(head)

    expect(headTags).toMatchInlineSnapshot(`
      "<title>0 items</title>
      <meta name="description" content="0 items from 5">
      <script type="application/ld+json">{"price":"5","count":"0"}</script>"
    `)
  })
})
