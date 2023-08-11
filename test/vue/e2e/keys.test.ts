import { describe, it } from 'vitest'
import type { ReactiveHead } from '@unhead/vue'
import { createHead } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'

describe('vue e2e keys', () => {
  it('ssr / csr hydration', async () => {
    const IndexSchema: ReactiveHead = {
      link: [{ rel: 'icon', href: '/page-index.ico', key: 'main-icon' }],
    }

    const AboutSchema: ReactiveHead = {
      link: [{ rel: 'icon', href: '/page-about.ico', key: 'main-icon' }],
    }

    // ssr render on the index page
    const ssrHead = createHead()

    ssrHead.push(IndexSchema)

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<link rel=\\"icon\\" href=\\"/page-index.ico\\" data-hid=\\"6b4a565\\">",
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
      <link rel=\\"icon\\" href=\\"/page-index.ico\\" data-hid=\\"6b4a565\\">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    index.dispose()

    csrHead.push(AboutSchema)

    expect(await csrHead.resolveTags()).toMatchInlineSnapshot(`
      [
        {
          "_d": "link:main-icon",
          "_e": 1,
          "_h": "6b4a565",
          "_p": 1024,
          "key": "main-icon",
          "props": {
            "data-hid": "6b4a565",
            "href": "/page-about.ico",
            "rel": "icon",
          },
          "tag": "link",
        },
      ]
    `)

    expect(csrHead._dom.elMap).toMatchInlineSnapshot(`
      {
        "6b4a565": <link
          data-hid="6b4a565"
          href="/page-index.ico"
          rel="icon"
        />,
      }
    `)

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <link rel=\\"icon\\" href=\\"/page-about.ico\\" data-hid=\\"6b4a565\\">
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
        "headTags": "<link rel=\\"stylesheet\\" href=\\"https://fonts.googleapis.com/css?family=Allison\\" data-hid=\\"f59c689\\">
      <link rel=\\"stylesheet\\" href=\\"https://fonts.googleapis.com/css?family=Meddon\\" data-hid=\\"66d43fa\\">
      <link rel=\\"stylesheet\\" href=\\"https://fonts.googleapis.com/css?family=Sacramento\\" data-hid=\\"5e41b59\\">",
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
      <link rel=\\"stylesheet\\" href=\\"https://fonts.googleapis.com/css?family=Allison\\" data-hid=\\"f59c689\\">
      <link rel=\\"stylesheet\\" href=\\"https://fonts.googleapis.com/css?family=Meddon\\" data-hid=\\"66d43fa\\">
      <link rel=\\"stylesheet\\" href=\\"https://fonts.googleapis.com/css?family=Sacramento\\" data-hid=\\"5e41b59\\">
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
      <link rel=\\"stylesheet\\" href=\\"https://fonts.googleapis.com/css?family=Allison&amp;text=Allison\\" data-hid=\\"f59c689\\">
      <link rel=\\"stylesheet\\" href=\\"https://fonts.googleapis.com/css?family=Meddon&amp;text=Meddon\\" data-hid=\\"66d43fa\\">
      <link rel=\\"stylesheet\\" href=\\"https://fonts.googleapis.com/css?family=Sacramento&amp;text=Sacramento\\" data-hid=\\"5e41b59\\">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})
