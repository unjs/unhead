import type { PrecompiledClientInput } from '../../src/precompiled/client-snapshot'
import type { PrecompiledServerSnapshot } from '../../src/precompiled/server-snapshot'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHead as createClientHead } from '../../src/precompiled/client-snapshot'
import { createHead as createServerHead, renderSSRHead, useHead as useServerHead } from '../../src/precompiled/server-snapshot'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('precompiled snapshots', () => {
  it('returns the finalized server payload by identity', () => {
    const payload: PrecompiledServerSnapshot = {
      headTags: '<title>Snapshot</title>',
      bodyTags: '',
      bodyTagsOpen: '',
      htmlAttrs: ' lang="en"',
      bodyAttrs: '',
    }
    const head = (createServerHead as (snapshot: PrecompiledServerSnapshot) => PrecompiledServerSnapshot)(payload)
    expect(renderSSRHead(head)).toBe(payload)
  })

  it('adopts matching SSR nodes and mounts the finalized client plan once', () => {
    const dom = new JSDOM('<!doctype html><html><head><title>Server</title><meta name="description" content="server"></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const existing = document.head.querySelector('meta')
    const plan: PrecompiledClientInput = [
      [100, 'title', 'title', {}, 'Snapshot'],
      [100, 'meta:description', 'meta', { name: 'description', content: 'client' }],
    ]

    const head = (createClientHead as (plan: PrecompiledClientInput) => ReturnType<typeof createClientHead>)(plan)
    expect(document.title).toBe('Snapshot')
    expect(document.head.querySelector('meta')).toBe(existing)
    expect(existing?.getAttribute('content')).toBe('client')
    expect(head.render()).toBe(true)
  })

  it('throws instead of silently executing an uncompiled snapshot call', () => {
    expect(() => createServerHead()).toThrow(/must be compiled/)
    expect(() => useServerHead({ title: 'dynamic' }, { head: {} as never })).toThrow(/must be compiled/)
  })

  it('applies an empty-title tombstone', () => {
    const dom = new JSDOM('<!doctype html><html><head><title>Initial</title></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const plan: PrecompiledClientInput = [[100, 'title', '', {}]]

    ;(createClientHead as (plan: PrecompiledClientInput) => ReturnType<typeof createClientHead>)(plan)
    expect(document.title).toBe('')
  })
})
