import type { PrecompiledClientInput } from '../../src/precompiled/client'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHead } from '../../src/precompiled/client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('precompiled client runtime', () => {
  it('registers a batch with one render and returns independently disposable entries', () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()
    const render = vi.spyOn(head, 'render')
    const batchedPush = head.push as (input: PrecompiledClientInput, batch?: 0) => ReturnType<typeof head.push>
    const entries = [
      batchedPush([[100, 'meta:description', 'meta', { name: 'description', content: 'first' }]], 0),
      batchedPush([[100, 'meta:description', 'meta', { name: 'description', content: 'second' }]]),
    ]

    expect(render).toHaveBeenCalledTimes(1)
    expect(document.head.querySelector('meta')?.getAttribute('content')).toBe('second')

    entries[1].dispose()
    expect(render).toHaveBeenCalledTimes(2)
    expect(document.head.querySelector('meta')?.getAttribute('content')).toBe('first')

    entries[0].dispose()
    expect(render).toHaveBeenCalledTimes(3)
    expect(document.head.querySelector('meta')).toBeNull()

    entries[0].dispose()
    expect(render).toHaveBeenCalledTimes(3)
  })

  it('adopts SSR elements once when registering a batch', () => {
    const dom = new JSDOM('<!doctype html><html><head><meta name="description" content="server"></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const existing = document.head.querySelector('meta')
    const head = createHead()
    const render = vi.spyOn(head, 'render')

    const batchedPush = head.push as (input: PrecompiledClientInput, batch?: 0) => ReturnType<typeof head.push>
    batchedPush([[100, 'meta:description', 'meta', { name: 'description', content: 'first' }]], 0)
    batchedPush([[100, 'meta:description', 'meta', { name: 'description', content: 'second' }]])

    expect(render).toHaveBeenCalledTimes(1)
    expect(document.head.querySelector('meta')).toBe(existing)
    expect(existing?.getAttribute('content')).toBe('second')
  })

  it('suspends and restores an entry without changing equal-priority order', () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()
    head.push([[100, 'title', 'title', {}, 'first']])
    const firstId = head._c
    head.push([[100, 'title', 'title', {}, 'second']])

    head._e.set(firstId, [])
    head.render()
    expect(document.title).toBe('second')
    head._e.set(firstId, [[100, 'title', 'title', {}, 'first']])
    head.render()
    expect(document.title).toBe('second')
  })

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

  it('does not serialize unrelated body children while adopting SSR tags', () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body><main></main></body></html>')
    vi.stubGlobal('document', dom.window.document)
    Object.defineProperty(document.querySelector('main'), 'innerHTML', {
      get: () => { throw new Error('app content was serialized') },
    })

    expect(() => createHead().push([[100, 'title', 'title', {}, 'Fast adoption']])).not.toThrow()
  })

  it('clears disabled attributes and content when a winner changes', () => {
    const dom = new JSDOM('<!doctype html><html data-page="old"><head></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()
    head.push([
      [100, 'htmlAttrs:data-page', 'htmlAttrs', { 'data-page': 'active' }],
      [100, 'style:id:theme', 'style', { id: 'theme', nonce: 'first' }, 'body{color:red}'],
    ])
    head.push([
      [100, 'htmlAttrs:data-page', 'htmlAttrs', { 'data-page': false }],
      [100, 'style:id:theme', 'style', { id: 'theme', nonce: null }],
    ])

    const style = document.querySelector('style')
    expect(document.documentElement.hasAttribute('data-page')).toBe(false)
    expect(style?.hasAttribute('nonce')).toBe(false)
    expect(style?.textContent).toBe('')
  })

  it('adopts rendered identities without collapsing distinct logical entries', () => {
    const content = '{"value":"\\u003C/script>"}'
    const dom = new JSDOM(`<!doctype html><html><head><script type="application/ld+json">${content}</script><script type="application/ld+json">${content}</script><script src="/app.js"></script></head><body></body></html>`)
    vi.stubGlobal('document', dom.window.document)
    const existing = [...document.head.querySelectorAll('script')]
    const head = createHead()
    const entry = head.push([
      [100, 'script:content:raw-one', 'script', { type: 'application/ld+json' }, content, undefined, 1, `script:content:${content}`],
      [100, 'script:content:raw-two', 'script', { type: 'application/ld+json' }, content, undefined, 1, `script:content:${content}`],
      [100, 'script:async:false,src:/app.js', 'script', { src: '/app.js', async: false }, undefined, undefined, undefined, 'script:src:/app.js'],
    ])

    expect([...document.head.querySelectorAll('script')]).toEqual(existing)
    entry.dispose()
    expect(document.head.querySelectorAll('script')).toHaveLength(0)
  })

  it('clears and restores a title through an empty-title tombstone', () => {
    const dom = new JSDOM('<!doctype html><html><head><title>Initial</title></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()
    head.push([[100, 'title', 'title', {}, 'First']])
    const empty = head.push([[100, 'title', '', {}]])

    expect(document.title).toBe('')
    empty.dispose()
    expect(document.title).toBe('First')
  })

  it('moves colliding adopted nodes to their compiled containers', () => {
    const dom = new JSDOM('<!doctype html><html><head><script>same</script></head><body><main></main><script>same</script></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const headScript = document.head.querySelector('script')
    const bodyScript = document.body.querySelector('script')
    const head = createHead()
    head.push([
      [10, 'script:body-logical', 'script', {}, 'same', 2, undefined, 'script:content:same'],
      [100, 'script:head-logical', 'script', {}, 'same', undefined, undefined, 'script:content:same'],
    ])

    expect(document.head.querySelectorAll('script')).toHaveLength(1)
    expect(document.body.querySelectorAll('script')).toHaveLength(1)
    expect(document.head.querySelector('script')).toBe(bodyScript)
    expect(document.body.querySelector('script')).toBe(headScript)
  })
})
