import { JSDOM } from 'jsdom'
import { expect, it } from 'vitest'
import { createHead } from '../packages/unhead/src/client'
import { createNavigationSession } from './csr-memory'

it('releases route hints while preserving the current page head', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
  try {
    const session = createNavigationSession(createHead, dom.window.document)
    await session.navigate(2)
    await session.navigate(3)

    expect(dom.window.document.title).toBe('Product 5 | Example Store')
    expect(dom.window.document.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://example.com/products/5')
    expect(dom.window.document.querySelectorAll('link[rel="prefetch"]')).toHaveLength(0)
    expect(session.detachedElements()).toBe(0)
  }
  finally {
    dom.window.close()
  }
})
