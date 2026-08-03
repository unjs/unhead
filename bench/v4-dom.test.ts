/**
 * DOM semantics: v4 client must produce the same document state as v3 for the
 * shared workload. Element order inside <head> is a designed difference
 * (v4 appends in capo resolve order, v3 in alias order), so element sets are
 * compared sorted; attrs, title, and html/body attributes compare exactly.
 */
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { createHead as createV3 } from '../packages/unhead/src/client'
import { createHead as createV4 } from '../packages/unhead/src/v4/client'
import { createHead as createV4Server, renderSSRHead as renderV4Server } from '../packages/unhead/src/v4/server'
import { applyPage } from './v4/fixtures'

const BLANK = '<!DOCTYPE html><html><head></head><body><div><h1>hello</h1></div></body></html>'

function domState(document: Document) {
  return {
    title: document.title,
    htmlAttrs: document.documentElement.getAttributeNames().sort().map(n => `${n}=${document.documentElement.getAttribute(n)}`),
    bodyAttrs: document.body.getAttributeNames().sort().map(n => `${n}=${document.body.getAttribute(n)}`),
    head: [...document.head.children].map(el => el.outerHTML).sort(),
    body: [...document.body.children].filter(el => el.tagName !== 'DIV').map(el => el.outerHTML).sort(),
  }
}

describe('v4 dom', () => {
  it('mount matches v3 document state', () => {
    const a = new JSDOM(BLANK)
    const v3 = createV3({ document: a.window.document })
    applyPage((input, opts) => v3.push(input, opts))
    v3.render()

    const b = new JSDOM(BLANK)
    const v4 = createV4({ document: b.window.document })
    applyPage((input, opts) => v4.push(input, opts))
    v4.render()

    const s3 = domState(a.window.document)
    const s4 = domState(b.window.document)
    // v3 client emits <title> as an element only via document.title; both should agree
    expect(s4.title).toBe(s3.title)
    expect(s4.htmlAttrs).toEqual(s3.htmlAttrs)
    expect(s4.bodyAttrs).toEqual(s3.bodyAttrs)
    expect(s4.head).toEqual(s3.head)
    expect(s4.body).toEqual(s3.body)
  })

  it('hydration adopts SSR elements instead of duplicating', () => {
    const server = createV4Server()
    applyPage((input, opts) => server.push(input, opts))
    const ssr = renderV4Server(server)
    const dom = new JSDOM(`<!DOCTYPE html><html${ssr.htmlAttrs}><head>${ssr.headTags}</head><body${ssr.bodyAttrs}>${ssr.bodyTagsOpen}<div id="app"></div>${ssr.bodyTags}</body></html>`)
    const doc = dom.window.document
    const before = doc.head.children.length

    const head = createV4({ document: doc })
    applyPage((input, opts) => head.push(input, opts))
    head.render()
    expect(doc.head.children.length).toBe(before)

    // mutate after hydration
    const entry = head.push({ title: 'Changed', meta: [{ name: 'description', content: 'changed' }] })
    head.render()
    expect(doc.title).toBe('Changed · Harlan Wilton')
    expect(doc.head.querySelectorAll('meta[name=description]').length).toBe(1)
    expect(doc.querySelector('meta[name=description]')!.getAttribute('content')).toBe('changed')
    entry.dispose()
    head.render()
    expect(doc.title).toBe('About · Harlan Wilton')
  })

  it('batches renders on the scheduler', () => {
    const dom = new JSDOM(BLANK)
    let flushes = 0
    let pending: (() => void) | null = null
    const head = createV4({
      document: dom.window.document,
      scheduler: (flush) => {
        flushes++
        pending = flush
      },
    })
    applyPage((input, opts) => head.push(input, opts))
    expect(flushes).toBe(1) // 7 pushes, one scheduled flush
    pending!()
    expect(dom.window.document.title).toBe('About · Harlan Wilton')
  })

  it('dispose removes owned elements and restores state', () => {
    const dom = new JSDOM(BLANK)
    const doc = dom.window.document
    const head = createV4({ document: doc })
    const entry = head.push({
      title: 'T',
      htmlAttrs: { class: 'x y' },
      meta: [{ name: 'description', content: 'd' }],
      script: [{ src: '/a.js' }],
    })
    head.render()
    // document.title materializes a <title> element in JSDOM; owned elements are meta + script
    expect(doc.querySelector('meta[name=description]')).toBeTruthy()
    expect(doc.querySelector('script[src="/a.js"]')).toBeTruthy()
    expect(doc.title).toBe('T')
    expect(doc.documentElement.className).toBe('x y')
    entry.dispose()
    head.render()
    expect(doc.querySelector('meta[name=description]')).toBeNull()
    expect(doc.querySelector('script[src="/a.js"]')).toBeNull()
    expect(doc.documentElement.className).toBe('')
    expect(doc.title).toBe('')
  })
})
