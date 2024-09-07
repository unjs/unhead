import { renderSSRHead } from '@unhead/ssr'
import { createHead } from 'unhead'
import { describe, it } from 'vitest'
import { ref } from 'vue'
import { ssrRenderOptionsHead } from '../util'

describe('ssr vue templateParams', () => {
  it('basic', async () => {
    const separator = ref('/')

    const headResult = await ssrRenderOptionsHead({
      title: 'hello world',
      titleTemplate: '%s %separator %siteName',
      meta: [
        {
          name: 'description',
          content: 'Welcome to %siteName!',
        },
      ],
      templateParams: {
        separator,
        siteName: () => 'My Awesome Site',
      },
    })

    expect(headResult).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>hello world &#x2F; My Awesome Site</title>
      <meta name="description" content="Welcome to My Awesome Site!">",
        "htmlAttrs": "",
      }
    `)
  })

  it('nuxt-unhead', async () => {
    const headResult = await ssrRenderOptionsHead({
      title: 'hello world',
      titleTemplate: '%pageTitle %titleSeparator %siteName',
      meta: [
        {
          name: 'description',
          content: 'Welcome to %siteName!',
        },
        {
          property: 'og:title',
          content: '%s %titleSeparator %siteName',
        },
      ],
      script: [
        {
          type: 'application/json',
          innerHTML: {
            title: '%s',
            description: '%site.description',
          },
          processTemplateParams: true,
        },
      ],
      templateParams: {
        titleSeparator: '·',
        siteUrl: 'https://harlanzw.com',
        siteName: 'Nuxt Playground',
        siteDescription: 'A Nuxt 3 playground',
        language: 'en',
        site: {
          description: 'A Nuxt 3 playground',
        },
      },
    })

    expect(headResult).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>hello world · Nuxt Playground</title>
      <meta name="description" content="Welcome to Nuxt Playground!">
      <meta property="og:title" content="hello world · Nuxt Playground">
      <script type="application/json">{"title":"hello world","description":"A Nuxt 3 playground"}</script>",
        "htmlAttrs": "",
      }
    `)
  })

  it('no input', async () => {
    const headResult = await ssrRenderOptionsHead({
      title: null,
      titleTemplate: '%s %separator %siteName',
      templateParams: {
      },
    })

    expect(headResult).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>%siteName</title>",
        "htmlAttrs": "",
      }
    `)
  })

  it('just separator input', async () => {
    const headResult = await ssrRenderOptionsHead({
      title: null,
      titleTemplate: '%s %separator %siteName',
      templateParams: {
        separator: '/',
      },
    })

    expect(headResult).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>%siteName</title>",
        "htmlAttrs": "",
      }
    `)
  })

  it('with siteName', async () => {
    const headResult = await ssrRenderOptionsHead({
      title: null,
      titleTemplate: '%s %separator %siteName',
      templateParams: {
        separator: '/',
        siteName: 'My Awesome Site',
      },
    })

    expect(headResult).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>My Awesome Site</title>",
        "htmlAttrs": "",
      }
    `)
  })

  it('edge case', async () => {
    const head = createHead()
    head.push({
      title: '%site.tagline',
      // DEV - My page title - My cool site
      titleTemplate: '%s %separator %site.name',
      meta: [
        {
          name: 'description',
          // Hi, welcome to the dev v0.0.0 of Nuxt Playground.
          content: 'Hi, welcome to the %envName v%app.version of %site.name.',
        },
      ],
    })
    head.push({
      templateParams: {
        foo: 'bar',
        envName: 'dev',
        app: {
          version: '0.0.0',
        },
        site: {
          name: 'test',
          tagline: 'my tag line',
        },
      },
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(`
      "<title>my tag line | test</title>
      <meta name="description" content="Hi, welcome to the dev v0.0.0 of test.">"
    `)
  })

  it('entry opt-out', async () => {
    const head = createHead()
    head.push({
      title: 'Hello %name',
      templateParams: { name: 'World' },
    }, {
      processTemplateParams: false,
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(`"<title>Hello %name</title>"`)
  })
})
