import { useHead, useSeoMeta } from 'unhead'
import { renderDOMHead } from 'unhead/client'
import { renderSSRHead } from 'unhead/server'
import { describe, it } from 'vitest'
import { createClientHeadWithContext, createServerHeadWithContext, useDom } from '../../util'

describe('unhead e2e useServerSeoMeta', () => {
  it('useServerSeoMeta', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createServerHeadWithContext()
    useSeoMeta(ssrHead, {
      title: 'title from nuxt.config.ts',
      description: 'Description from nuxt.config.ts',
    }, {
      tagPriority: 'low',
    })
    useHead(ssrHead, {
      htmlAttrs: { lang: 'nuxt.config' },
      script: [
        {
          innerHTML: 'lorem ipsum generate more lorem ipsum',
        },
      ],
    }, {
      mode: 'server',
    })
    // i.e App.vue
    useSeoMeta(ssrHead, {
      title: 'title mainpage',
      description: 'description mainpage',
    }, {
      mode: 'server',
    })
    useHead(ssrHead, {
      htmlAttrs: { lang: 'app.vue' },
    }, {
      mode: 'server',
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>title mainpage</title>
      <script>lorem ipsum generate more lorem ipsum</script>
      <meta name="description" content="description mainpage">
      <script id="unhead:payload" type="application/json">{"title":"title mainpage"}</script>",
        "htmlAttrs": " lang="app.vue"",
      }
    `)

    const dom = useDom(data)

    const csrHead = createClientHeadWithContext({
      document: dom.window.document,
    })
    useHead(ssrHead, {
      htmlAttrs: { lang: 'nuxt.config' },
    }, {
      tagPriority: 'low',
    })
    useSeoMeta(csrHead, {
      title: 'Some cool reproduction repo :)',
      description: 'Description from nuxt.config.ts',
    }, {
      tagPriority: 'low',
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang="app.vue"><head>
      <title>title mainpage</title>
      <script>lorem ipsum generate more lorem ipsum</script>
      <meta name="description" content="Description from nuxt.config.ts">
      <script id="unhead:payload" type="application/json">{"title":"title mainpage"}</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
