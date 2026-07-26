// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { renderSSRHead } from '@unhead/ssr'
import { useSeoMeta } from '@unhead/vue'
import { createHead } from '@unhead/vue/client'
import { describe, it } from 'vitest'
import { useDom, withoutObjectHasOwn } from '../../../../unhead/test/fixtures'
import { csrVueAppWithUnhead, ssrVueAppWithUnhead } from '../../util'

describe('unhead vue e2e useSeoMeta', () => {
  it('normalizes flat meta without Object.hasOwn', () => {
    const dom = useDom()
    const head = createHead()
    withoutObjectHasOwn(() => {
      useSeoMeta({ description: 'Compatible' }, { head })
    })
    renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Compatible')
  })

  it('normalizes flat meta patches', async () => {
    const dom = useDom()
    let entry: ReturnType<typeof useSeoMeta> | undefined
    const head = csrVueAppWithUnhead(dom, () => {
      entry = useSeoMeta({
        title: 'Initial',
        description: 'Initial description',
      })
    })
    renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.title).toBe('Initial')
    expect(dom.window.document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Initial description')

    entry!.patch({
      title: 'Updated',
      titleTemplate: '%s - Site',
      description: 'Updated description',
      ogTitle: 'Updated OG title',
    })
    renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.title).toBe('Updated - Site')
    expect(dom.window.document.querySelectorAll('meta[name="description"]').length).toBe(1)
    expect(dom.window.document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Updated description')
    expect(dom.window.document.querySelectorAll('meta[property="og:title"]').length).toBe(1)
    expect(dom.window.document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Updated OG title')
  })

  it('duplicate articleTag', async () => {
    const ssrHead = await ssrVueAppWithUnhead(() => {
      useSeoMeta({
        articleTag: ['foo', 'bar'],
      })
    })
    const data = renderSSRHead(ssrHead)
    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta property="article:tag" content="foo">
      <meta property="article:tag" content="bar">",
        "htmlAttrs": "",
      }
    `)
    const dom = useDom(data)
    let home
    const csrHead = csrVueAppWithUnhead(dom, () => {
      home = useSeoMeta({
        articleTag: ['foo', 'bar'],
      })
    })
    renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>
      <meta property="article:tag" content="foo">
      <meta property="article:tag" content="bar">
      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)

    home!.dispose()
    useSeoMeta({
      articleTag: ['test'],
    }, {
      head: csrHead,
    })
    renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>
      <meta property="article:tag" content="test">

      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })
})
