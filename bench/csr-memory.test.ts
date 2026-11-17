import { JSDOM } from 'jsdom'
import { expect, it } from 'vitest'
import { createHead } from '../packages/unhead/src/client'
import { createNavigationSession } from './csr-memory'

it('updates product-page metadata and removes router hints', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
  try {
    const session = createNavigationSession(createHead, dom.window.document)
    await session.navigate(2)
    await session.navigate(3)

    expect(dom.window.document.title).toBe('Product 5 | Example Store')
    expect(dom.window.document.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://example.com/products/5')
    expect(dom.window.document.querySelectorAll('link[rel="prefetch"]')).toHaveLength(0)
    expect(dom.window.document.querySelector('link[rel="modulepreload"]')?.getAttribute('href'))
      .toBe('/_nuxt/page-5.js')
    expect(dom.window.document.querySelector('link[rel="preload"]')?.getAttribute('href'))
      .toBe('/products/5/hero.webp')
  }
  finally {
    dom.window.close()
  }
})
