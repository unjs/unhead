import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createClientHeadWithContext, useDelayedSerializedDom, useDom, useDOMHead } from '../../util'

describe('templateParams', () => {
  it('basic', async () => {
    const head = useDOMHead({
      plugins: [TemplateParamsPlugin],
    })

    useHead(head, {
      templateParams: {
        site: {
          name: 'My Site',
          url: 'https://example.com',
        },
        separator: '-',
        path: '/some/page',
      },
      title: 'My Page',
      titleTemplate: '%s %separator %site.name',
      script: [
        {
          id: 'site-data',
          type: 'application/json',
          innerHTML: {
            pageTitle: '%s',
            siteName: '%site.name',
            siteUrl: '%site.url',
          },
          processTemplateParams: true,
        },
      ],
      meta: [
        {
          property: 'twitter:image',
          content: 'https://cdn.example.com/some%20image.jpg',
        },
        {
          name: 'description',
          content: 'Welcome to %site.name.',
        },
        {
          property: 'og:image',
          content: 'https://firebasestorage.googleapis.com/v0/b/buuger.appspot.com/o/accounts%2Ffotobuukmy%2Fseries%2Fwedding-studio%2Fbuuks%2Fapril-film-studio%2Fcover.jpg?alt=media&token=8b93a6d5-dec2-4f28-9792-4568d73eeb5b',
        },
        {
          property: 'og:site_name',
          content: '%site.name',
        },
        {
          property: 'og:url',
          content: '%site.url/my-page',
        },
      ],
      link: [
        {
          rel: 'canonical',
          href: '%site.url%path',
        },
      ],
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <title>My Page - My Site</title><script id="site-data" type="application/json">{"pageTitle":"My Page","siteName":"My Site","siteUrl":"https://example.com"}</script><meta property="twitter:image" content="https://cdn.example.com/some%20image.jpg"><meta name="description" content="Welcome to My Site."><meta property="og:image" content="https://firebasestorage.googleapis.com/v0/b/buuger.appspot.com/o/accounts%2Ffotobuukmy%2Fseries%2Fwedding-studio%2Fbuuks%2Fapril-film-studio%2Fcover.jpg?alt=media&amp;token=8b93a6d5-dec2-4f28-9792-4568d73eeb5b"><meta property="og:site_name" content="My Site"><meta property="og:url" content="https://example.com/my-page"><link rel="canonical" href="https://example.com/some/page"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('separator', async () => {
    const head = useDOMHead({
      plugins: [TemplateParamsPlugin],
    })

    useHead(head, {
      templateParams: {
        site: {
          name: 'My Site',
        },
        separator: '-',
        subPage: null, // empty
      },
      title: 'My Page',
      titleTemplate: '%s %separator %subPage %separator %site.name',
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <title>My Page - My Site</title></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('json', async () => {
    const head = useDOMHead({
      plugins: [TemplateParamsPlugin],
    })

    useHead(head, {
      title: 'Home & //<"With Encoding">\\',
      script: [
        {
          type: 'application/json',
          innerHTML: JSON.stringify({
            title: '%s',
          }),
          processTemplateParams: true,
        },
      ],
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <title>Home &amp; //&lt;"With Encoding"&gt;\\</title><script type="application/json">{"title":"Home & //\\u003C\\"With Encoding\\">\\\\"}</script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('inheritance', async () => {
    const head = useDOMHead({
      plugins: [TemplateParamsPlugin],
    })

    useHead(head, {
      templateParams: {
        site: {
          name: 'My Site',
          url: 'https://example.com',
        },
        separator: '-',
        path: '',
      },
      meta: [
        {
          property: 'og:url',
          content: '%site.url%path',
        },
      ],
    })

    useHead(head, {
      templateParams: {
        path: '/some/page',
      },
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <meta property="og:url" content="https://example.com/some/page"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('payload', async () => {
    const dom = useDom({
      headTags: '<title>default</title><script id="unhead:payload">{"templateParams": {"siteName": "Test"}, "titleTemplate": "%s %separator %siteName"}</script>',
    })
    const head = createClientHeadWithContext({
      document: dom.window.document,
      plugins: [TemplateParamsPlugin],
    })
    useHead(head, {
      title: 'test',
    })

    const html = await new Promise<string>((resolve) => {
      setTimeout(() => resolve(dom!.serialize()), 250)
    })

    expect(html).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <title>test | Test</title><script id="unhead:payload">{"templateParams": {"siteName": "Test"}, "titleTemplate": "%s %separator %siteName"}</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('edge case #561', async () => {
    const dom = useDom({
      headTags: '<title>Vite</title>',
    })
    const head = createClientHeadWithContext({
      document: dom.window.document,
      plugins: [TemplateParamsPlugin],
    })
    // The test should ensure that:
    // 1. The existing title "Vite" is captured as %s
    // 2. Empty string companyName stays empty (not converted to true)
    // 3. The separator adjacent to empty values should be removed
    useHead(head, {
      titleTemplate: `%s %separator %companyName %separator %siteTitle`,
      templateParams: {
        companyName: '',
        siteTitle: 'Site title',
      },
    })
    const html = await new Promise<string>((resolve) => {
      setTimeout(() => resolve(dom!.serialize()), 250)
    })

    expect(html).toContain('<title>Site title</title>')
  })
})
