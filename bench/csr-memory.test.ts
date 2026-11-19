import { JSDOM } from 'jsdom'
import { expect, it } from 'vitest'
import { createHead } from '../packages/unhead/src/client'
import { createHead as createServerHead, renderSSRHead } from '../packages/unhead/src/server'
import { createNavigationSession, renderProductPage } from './csr-memory'

it.each(['router-hints', 'managed', 'large-app'] as const)('updates product-page metadata for the %s profile', async (profile) => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
  let insertedHints = 0
  const observer = new dom.window.MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof dom.window.HTMLLinkElement && node.rel === 'prefetch')
          insertedHints++
      }
    }
  })
  observer.observe(dom.window.document.head, { childList: true })
  try {
    const session = createNavigationSession(createHead, dom.window.document, profile)
    await session.navigate(2)
    await session.navigate(3)

    expect(dom.window.document.title).toBe('Product 5 | Example Store')
    expect(dom.window.document.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://example.com/products/5')
    expect(dom.window.document.querySelectorAll('link[rel="prefetch"]')).toHaveLength(0)
    expect(insertedHints).toBe(profile === 'managed' ? 0 : profile === 'large-app' ? 120 : 40)
    expect(dom.window.document.querySelector('link[href="/_nuxt/page-5.js"]')).not.toBeNull()
    if (profile === 'large-app') {
      expect(dom.window.document.querySelector('link[href="/_nuxt/shared-0.js"]')).not.toBeNull()
      expect(dom.window.document.querySelector('link[href="/_nuxt/shared-15.css"]')).not.toBeNull()
    }
    expect(dom.window.document.querySelector('link[rel="preload"]')?.getAttribute('href'))
      .toBe('/products/5/hero.webp')
  }
  finally {
    observer.disconnect()
    dom.window.close()
  }
})

it('renders product-page metadata for independent SSR requests', () => {
  const first = renderProductPage(createServerHead, renderSSRHead, 1)
  const second = renderProductPage(createServerHead, renderSSRHead, 2)

  expect(first.headTags).toContain('<title>Product 1 | Example Store</title>')
  expect(second.headTags).toContain('<title>Product 2 | Example Store</title>')
  expect(second.headTags).toContain('https://example.com/products/2')
  expect(second.headTags).not.toContain('https://example.com/products/1')
})
