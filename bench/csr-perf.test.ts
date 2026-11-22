import { JSDOM } from 'jsdom'
import { createHead } from 'unhead/client'
import { expect, it } from 'vitest'
import { createCsrWorkload, hydrateSsrHead, observeDomReads, ssrHydrationHtml } from './csr-perf'

it('adopts the SSR head and preserves Nuxt resource hints', () => {
  const dom = new JSDOM(ssrHydrationHtml)
  try {
    const document = dom.window.document
    const nodes = [...document.head.children, ...document.body.children]
    const hint = document.head.querySelector('link[rel="modulepreload"]')
    const style = document.head.querySelector('style[data-hid]')

    const entry = hydrateSsrHead(createHead, document)

    expect([...document.head.children, ...document.body.children].map(node => nodes.indexOf(node))).toEqual(nodes.map((_, index) => index))
    expect(document.head.querySelector('style[data-hid]')).toBe(style)

    entry.dispose()

    expect(document.head.querySelector('style[data-hid]')).toBeNull()
    expect(document.head.querySelector('link[rel="modulepreload"]')).toBe(hint)
  }
  finally {
    dom.window.close()
  }
})

it.each(['idle', 'cached'] as const)('avoids DOM discovery for %s renders', (scenario) => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
  try {
    const render = createCsrWorkload(createHead, dom.window.document, scenario)
    expect(observeDomReads(dom.window.document, render)).toEqual({ connectivity: 0, scans: 0 })
    expect(dom.window.document.title).toBe(scenario === 'idle' ? 'Page 0' : 'Page 1')
  }
  finally {
    dom.window.close()
  }
})

it('observes DOM discovery when a new tag is needed', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
  try {
    const render = createCsrWorkload(createHead, dom.window.document, 'missing')
    expect(observeDomReads(dom.window.document, render).scans).toBe(1)
    expect(dom.window.document.querySelector('link[rel="preload"]')?.getAttribute('href')).toBe('/hero-1.webp')
  }
  finally {
    dom.window.close()
  }
})

it('counts actual connectivity reads and restores normal DOM access', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
  try {
    const document = dom.window.document
    const link = document.createElement('link')
    document.head.appendChild(link)
    const reads = observeDomReads(document, () => {
      expect(link.isConnected).toBe(true)
      link.remove()
      expect(link.isConnected).toBe(false)
    })
    expect(reads).toEqual({ connectivity: 2, scans: 0 })
    expect(link.isConnected).toBe(false)
    expect(reads.connectivity).toBe(2)
  }
  finally {
    dom.window.close()
  }
})

it.each([
  ['router-fresh', 31],
  ['router-long', 501],
  ['large-fresh', 31],
  ['large-long', 1001],
] as const)('measures two discovery passes for %s navigation', (scenario, page) => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
  try {
    const render = createCsrWorkload(createHead, dom.window.document, scenario)
    const observer = new dom.window.MutationObserver(() => {})
    observer.observe(dom.window.document.head, { childList: true })
    expect(observeDomReads(dom.window.document, render).scans).toBe(2)
    const hints = observer.takeRecords()
      .flatMap(record => [...record.addedNodes])
      .filter(node => node instanceof dom.window.HTMLLinkElement && node.rel === 'prefetch')
    observer.disconnect()
    expect(hints).toHaveLength(scenario.startsWith('large-') ? 24 : 8)
    expect(dom.window.document.querySelectorAll('link[rel="prefetch"]')).toHaveLength(0)
    expect(dom.window.document.title).toBe(`Product ${page} | Example Store`)
  }
  finally {
    dom.window.close()
  }
})
