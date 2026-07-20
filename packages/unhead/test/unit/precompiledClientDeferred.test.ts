import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHead } from '../../src/precompiled/client-deferred'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('deferred precompiled client runtime', () => {
  it('leaves SSR tags untouched until the runtime loads, then adopts them', async () => {
    const dom = new JSDOM('<!doctype html><html><head><meta name="description" content="server"></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const existing = document.head.querySelector('meta')
    const head = createHead()

    head.push([[100, 'meta:description', 'meta', { name: 'description', content: 'client' }]])
    expect(existing?.getAttribute('content')).toBe('server')

    await head.ready
    expect(document.head.querySelector('meta')).toBe(existing)
    expect(existing?.getAttribute('content')).toBe('client')
  })

  it('does not replay a plan disposed before the runtime loads', async () => {
    const dom = new JSDOM('<!doctype html><html><head><title>Server</title></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()
    const queued = head.push([[100, 'title', 'title', {}, 'Client']])

    queued.dispose()
    await head.ready
    expect(document.title).toBe('Server')
  })

  it('adopts and removes stale SSR elements disposed before loading', async () => {
    const dom = new JSDOM('<!doctype html><html><head><meta name="description" content="old"></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()
    const queued = head.push([[100, 'meta:description', 'meta', { name: 'description', content: 'old' }]])

    queued.dispose()
    await head.ready
    expect(document.head.querySelector('meta')).toBeNull()
  })

  it('never mounts a disposed queued script while adopting the document', async () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const observer = new dom.window.MutationObserver(() => {})
    observer.observe(document.head, { childList: true })
    const head = createHead()
    const queued = head.push([[100, 'script:src:/disposed.js', 'script', { src: '/disposed.js' }]])

    queued.dispose()
    await head.ready
    const mountedScripts = observer.takeRecords().flatMap(record => [...record.addedNodes]).filter(node => node.nodeName === 'SCRIPT')
    observer.disconnect()
    expect(mountedScripts).toHaveLength(0)
    expect(document.head.querySelector('script')).toBeNull()
  })

  it('preserves disposal after queued entries replay', async () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()
    const first = head.push([[100, 'meta:description', 'meta', { name: 'description', content: 'first' }]])
    const second = head.push([[100, 'meta:description', 'meta', { name: 'description', content: 'second' }]])

    await head.ready
    expect(document.head.querySelector('meta')?.getAttribute('content')).toBe('second')
    second.dispose()
    expect(document.head.querySelector('meta')?.getAttribute('content')).toBe('first')
    first.dispose()
    expect(document.head.querySelector('meta')).toBeNull()
  })

  it('preserves lifecycle activation before and after replay', async () => {
    const dom = new JSDOM('<!doctype html><html><head><title>Server</title></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()
    const first = head.push([[100, 'title', 'title', {}, 'First']])
    const second = head.push([[100, 'title', 'title', {}, 'Second']])

    second._setActive(false)
    expect(document.title).toBe('Server')
    await head.ready
    expect(document.title).toBe('First')

    second._setActive(true)
    expect(document.title).toBe('Second')
    second._setActive(false)
    expect(document.title).toBe('First')
    first.dispose()
  })
})
