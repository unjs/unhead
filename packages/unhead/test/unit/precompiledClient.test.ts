import type { PrecompiledClientInput } from '../../src/precompiled/client'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHead } from '../../src/precompiled/client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('precompiled client runtime', () => {
  it('adopts SSR tags and reconciles entry disposal without normalization', () => {
    const dom = new JSDOM('<!doctype html><html lang="en"><head><title>Product</title><meta name="description" content="first" data-page="product"></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const existing = document.head.querySelector('meta')
    const head = createHead()
    const first: PrecompiledClientInput = [
      [10, 'title', 'title', {}, 'Product'],
      [100, 'meta:description', 'meta', { 'name': 'description', 'content': 'first', 'data-page': 'product' }],
      [100, 'htmlAttrs:lang', 'htmlAttrs', { lang: 'en-AU' }],
    ]
    const second: PrecompiledClientInput = [
      [100, 'meta:description', 'meta', { name: 'description', content: 'second' }],
    ]

    const firstEntry = head.push(first)
    expect(document.head.querySelector('meta')).toBe(existing)
    expect(document.documentElement.lang).toBe('en-AU')

    const secondEntry = head.push(second)
    expect(existing?.getAttribute('content')).toBe('second')
    expect(existing?.hasAttribute('data-page')).toBe(false)

    secondEntry.dispose()
    expect(existing?.getAttribute('content')).toBe('first')
    expect(existing?.getAttribute('data-page')).toBe('product')

    firstEntry.dispose()
    expect(document.head.querySelector('meta')).toBeNull()
    expect(document.documentElement.hasAttribute('lang')).toBe(false)
    expect(document.title).toBe('Product')
  })

  it('inserts body-positioned elements and removes them on disposal', () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body><main></main></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()
    const entry = head.push([
      [80, 'script:src:/open.js', 'script', { src: '/open.js' }, '', 1],
      [80, 'script:src:/close.js', 'script', { src: '/close.js' }, '', 2],
    ])

    expect(document.body.firstElementChild?.getAttribute('src')).toBe('/open.js')
    expect(document.body.lastElementChild?.getAttribute('src')).toBe('/close.js')
    entry.dispose()
    expect(document.body.querySelectorAll('script')).toHaveLength(0)
  })
})
