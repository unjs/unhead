import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHead } from '../../src/precompiled/client-deferred'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.doUnmock('../../src/precompiled/client')
})

function stubIdle() {
  let callback: IdleRequestCallback | undefined
  const request = vi.fn((cb: IdleRequestCallback) => {
    callback = cb
    return 7
  })
  const cancel = vi.fn()
  vi.stubGlobal('requestIdleCallback', request)
  vi.stubGlobal('cancelIdleCallback', cancel)
  return {
    cancel,
    request,
    run() {
      callback?.({ didTimeout: false, timeRemaining: () => 50 })
    },
  }
}

describe('deferred precompiled client runtime', () => {
  it('waits for idle after the initial push burst', async () => {
    const dom = new JSDOM('<!doctype html><html><head><title>Server</title></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const idle = stubIdle()
    const head = createHead()

    head.push([[100, 'title', 'title', {}, 'Client']])
    expect(idle.request).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 })
    await vi.dynamicImportSettled()
    expect(document.title).toBe('Server')

    idle.run()
    await head.load()
    expect(document.title).toBe('Client')
  })

  it('uses a cancellable timeout fallback when idle callbacks are unavailable', async () => {
    vi.useFakeTimers()
    const dom = new JSDOM('<!doctype html><html><head><title>Server</title></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()

    head.push([[100, 'title', 'title', {}, 'Client']])
    expect(vi.getTimerCount()).toBe(1)
    await vi.runAllTimersAsync()
    await head.ready
    expect(document.title).toBe('Client')
  })

  it.each([
    ['a later push', (head: ReturnType<typeof createHead>) => head.push([[100, 'meta:description', 'meta', { name: 'description', content: 'later' }]])],
    ['a later disposal', (_head: ReturnType<typeof createHead>, entry: ReturnType<ReturnType<typeof createHead>['push']>) => entry.dispose()],
    ['a later activation change', (_head: ReturnType<typeof createHead>, entry: ReturnType<ReturnType<typeof createHead>['push']>) => entry._setActive(false)],
    ['render', (head: ReturnType<typeof createHead>) => head.render()],
    ['load', (head: ReturnType<typeof createHead>) => head.load()],
    ['the ready getter', (head: ReturnType<typeof createHead>) => head.ready],
  ])('loads on demand from %s after the initial push burst', async (_name, demand) => {
    const dom = new JSDOM('<!doctype html><html><head><title>Server</title></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const idle = stubIdle()
    const head = createHead()
    const entry = head.push([[100, 'title', 'title', {}, 'Client']])

    await Promise.resolve()
    demand(head, entry)
    expect(idle.cancel).toHaveBeenCalledWith(7)
    await head.load()
  })

  it('cancels the timeout fallback when loading is demanded', async () => {
    const clear = vi.fn()
    vi.stubGlobal('setTimeout', vi.fn(() => 7))
    vi.stubGlobal('clearTimeout', clear)
    const head = createHead()
    head.push([[100, 'title', 'title', {}, 'Client']])

    const loading = head.load()
    expect(clear).toHaveBeenCalledWith(7)
    await loading
  })

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

  it('rejects one stable readiness promise and preserves SSR when loading fails', async () => {
    vi.doMock('../../src/precompiled/client', () => {
      throw new Error('deferred runtime failed')
    })
    vi.resetModules()
    const { createHead: createFailingHead } = await import('../../src/precompiled/client-deferred')
    const dom = new JSDOM('<!doctype html><html><head><title>Server</title></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createFailingHead()
    head.push([[100, 'title', 'title', {}, 'Client']])

    const loading = head.load()
    expect(head.load()).toBe(loading)
    expect(head.ready).toBe(loading)
    await expect(loading).rejects.toThrow()
    expect(document.title).toBe('Server')
  })
})
