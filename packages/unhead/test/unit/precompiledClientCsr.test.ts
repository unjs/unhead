import type { PrecompiledClientInput } from '../../src/precompiled/client'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHead } from '../../src/precompiled/client-csr'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('precompiled CSR client runtime', () => {
  it('leaves initial DOM nodes unmanaged instead of adopting them', () => {
    const dom = new JSDOM('<!doctype html><html><head><meta name="description" content="server"></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const existing = document.head.querySelector('meta')
    const head = createHead()
    const entry = head.push([[100, 'meta:description', 'meta', { name: 'description', content: 'client' }]])
    const metas = document.head.querySelectorAll('meta')

    expect(metas).toHaveLength(2)
    expect(metas[0]).toBe(existing)
    expect(metas[0].getAttribute('content')).toBe('server')
    expect(metas[1].getAttribute('content')).toBe('client')

    entry.dispose()
    expect(document.head.querySelectorAll('meta')).toHaveLength(1)
    expect(document.head.querySelector('meta')).toBe(existing)
    expect(existing?.getAttribute('content')).toBe('server')
  })

  it('batches one render and independently restores and disposes managed winners', () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()
    const render = vi.spyOn(head, 'render')
    const batchedPush = head.push as (input: PrecompiledClientInput, batch?: 0) => ReturnType<typeof head.push>
    const entries = [
      batchedPush([[100, 'meta:description', 'meta', { 'name': 'description', 'content': 'first', 'data-page': 'first' }]], 0),
      batchedPush([[100, 'meta:description', 'meta', { name: 'description', content: 'second' }]]),
    ]
    const managed = document.head.querySelector('meta')

    expect(render).toHaveBeenCalledTimes(1)
    expect(managed?.getAttribute('content')).toBe('second')
    expect(managed?.hasAttribute('data-page')).toBe(false)

    entries[1].dispose()
    expect(document.head.querySelector('meta')).toBe(managed)
    expect(managed?.getAttribute('content')).toBe('first')
    expect(managed?.getAttribute('data-page')).toBe('first')

    entries[0].dispose()
    expect(document.head.querySelector('meta')).toBeNull()
  })

  it('clears disabled attributes and omitted content on managed elements', () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()
    head.push([[100, 'style:id:theme', 'style', { id: 'theme', nonce: 'first' }, 'body{color:red}']])
    head.push([[100, 'style:id:theme', 'style', { id: 'theme', nonce: false }]])

    const style = document.querySelector('style')
    expect(style?.hasAttribute('nonce')).toBe(false)
    expect(style?.textContent).toBe('')
  })

  it('lets an empty title override and then restore a previous winner', () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createHead()
    head.push([[100, 'title', 'title', {}, 'First']])
    const empty = head.push([[100, 'title', '', {}]])

    expect(document.title).toBe('')
    empty.dispose()
    expect(document.title).toBe('First')
  })
})
