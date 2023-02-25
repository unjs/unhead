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
      <meta name=\\"description\\" content=\\"Welcome to My Awesome Site!\\">",
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
      ],
      templateParams: {
        titleSeparator: '·',
        siteUrl: 'https://harlanzw.com',
        siteName: 'Nuxt Playground',
        siteDescription: 'A Nuxt 3 playground',
        language: 'en',
      },
    })

    expect(headResult).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>hello world · Nuxt Playground</title>
      <meta name=\\"description\\" content=\\"Welcome to Nuxt Playground!\\">",
        "htmlAttrs": "",
      }
    `)
  })
})
