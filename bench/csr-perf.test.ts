import { JSDOM } from 'jsdom'
import { createHead } from 'unhead/client'
import { expect, it } from 'vitest'
import { createCsrWorkload, observeDomReads } from './csr-perf'

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

it.each(['router-fresh', 'router-long'] as const)('measures two discovery passes for %s navigation', (scenario) => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
  try {
    const render = createCsrWorkload(createHead, dom.window.document, scenario)
    expect(observeDomReads(dom.window.document, render).scans).toBe(2)
    expect(dom.window.document.querySelectorAll('link[rel="prefetch"]')).toHaveLength(0)
    expect(dom.window.document.title).toBe(`Product ${scenario === 'router-long' ? 501 : 31} | Example Store`)
  }
  finally {
    dom.window.close()
  }
})
