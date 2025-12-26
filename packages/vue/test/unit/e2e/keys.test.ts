import type { ReactiveHead } from '@unhead/vue'
import { renderDOMHead } from '@unhead/dom'
import { renderSSRHead } from '@unhead/ssr'
import { createHead } from '@unhead/vue/client'
import { createHead as createServerHead } from '@unhead/vue/server'
import { resolveTags } from 'unhead/utils'
import { describe, it } from 'vitest'
import { useDom } from '../../../../unhead/test/fixtures'

describe('vue e2e keys', () => {
  it('ssr / csr hydration', async () => {
    const IndexSchema: ReactiveHead = {
      link: [{ rel: 'icon', href: '/page-index.ico', key: 'main-icon' }],
    }

    const AboutSchema: ReactiveHead = {
      link: [{ rel: 'icon', href: '/page-about.ico', key: 'main-icon' }],
    }

    // ssr render on the index page
    const ssrHead = createServerHead({
      disableDefaults: true,
    })

    ssrHead.push(IndexSchema)

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<link rel="icon" href="/page-index.ico" data-hid="main-icon">",
        "htmlAttrs": "",
      }
    `)

    // mount client side with same data
    const dom = useDom(data)
    const csrHead = createHead({
      document: dom.window.document,
    })

    const index = csrHead.push(IndexSchema)

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <link rel="icon" href="/page-index.ico" data-hid="main-icon">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    index.dispose()

    csrHead.push(AboutSchema)

    expect(resolveTags(csrHead)).toMatchInlineSnapshot(`
      [
        {
          "_d": "link:key:main-icon",
          "_h": "main-icon",
          "_p": 2048,
          "_w": 100,
          "key": "main-icon",
          "props": {
            "data-hid": "main-icon",
            "href": "/page-about.ico",
            "rel": "icon",
          },
          "tag": "link",
        },
      ]
    `)

    // @ts-expect-error untyped
    expect([...csrHead._dom?.elMap.values()][2]).toMatchInlineSnapshot(`
      <link
        data-hid="main-icon"
        href="/page-index.ico"
        rel="icon"
      />
    `)

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <link rel="icon" href="/page-about.ico" data-hid="main-icon">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('example #2', async () => {
    // ssr render on the index page
    const ssrHead = createHead()

    const fonts = [
      'Allison',
      'Meddon',
      'Sacramento',
    ]

    const schema = (value: boolean) => ({
      link: fonts.map((font) => {
        const family = font.replace(/ /g, '+')
        const text = value ? `&text=${font.replace(/ /g, '')}` : ''
        const key = font.replace(/ /, '')
        return {
          rel: 'stylesheet',
          href: `https://fonts.googleapis.com/css?family=${family}${text}`,
          key,
        }
      }),
    })

    ssrHead.push(schema(false))

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Allison" data-hid="Allison">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Meddon" data-hid="Meddon">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Sacramento" data-hid="Sacramento">",
        "htmlAttrs": "",
      }
    `)

    // mount client side with same data
    const dom = useDom(data)
    const csrHead = createHead({
      document: dom.window.document,
    })

    const entry = csrHead.push(schema(false))

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Allison" data-hid="Allison">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Meddon" data-hid="Meddon">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Sacramento" data-hid="Sacramento">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    entry.patch(schema(true))

    await renderDOMHead(csrHead, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Allison&amp;text=Allison" data-hid="Allison">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Meddon&amp;text=Meddon" data-hid="Meddon">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Sacramento&amp;text=Sacramento" data-hid="Sacramento">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
