import { JSDOM } from 'jsdom'
import { createHead } from 'unhead/client'
import { describe, expect, it } from 'vitest'

const LD_JSON = '{"@type":"Organization"}'

function setup() {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="app">app</div></body></html>')
  return dom.window.document
}

function appendJsonLd(doc: Document) {
  const el = doc.createElement('script')
  el.setAttribute('type', 'application/ld+json')
  el.innerHTML = LD_JSON
  doc.body.appendChild(el)
  return el
}

describe('adopting late Streamed Body Tags', () => {
  it('reuses a tag appended between renders', async () => {
    const doc = setup()
    const head = createHead({ document: doc })

    head.push({ title: 'first' })
    await head.render()

    const streamed = appendJsonLd(doc)

    head.push({ script: [{ type: 'application/ld+json', innerHTML: LD_JSON }] })
    await head.render()

    const found = doc.querySelectorAll('script[type="application/ld+json"]')
    expect(found).toHaveLength(1)
    expect(found[0]).toBe(streamed)
    expect(doc.head.querySelector('script[type="application/ld+json"]')).toBeNull()
  })

  it('still creates a tag that is genuinely absent', async () => {
    const doc = setup()
    const head = createHead({ document: doc })

    head.push({ title: 'first' })
    await head.render()

    head.push({ meta: [{ name: 'description', content: 'added' }] })
    await head.render()

    expect(doc.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('added')
  })

  it('does not re-key tags it already tracks', async () => {
    const doc = setup()
    const head = createHead({ document: doc })

    head.push({ meta: [{ name: 'description', content: 'one' }] })
    await head.render()
    appendJsonLd(doc)

    head.push({ script: [{ type: 'application/ld+json', innerHTML: LD_JSON }] })
    await head.render()

    expect(doc.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(doc.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('one')
  })
})
