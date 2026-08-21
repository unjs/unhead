import type { PrecompiledUniqueHeadInput } from '../../src/precompiled/server-unique'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHead as createClientHead } from '../../src/precompiled/client'
import { renderSSRHead } from '../../src/precompiled/server-unique'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('globally unique precompiled plans', () => {
  it('renders server plans without changing their build-finalized order', () => {
    expect(renderSSRHead({
      _p: [[
        [10, '<title>Unique</title>'],
        [100, '<meta name="description" content="unique">'],
      ]],
    })).toEqual({
      headTags: '<title>Unique</title><meta name="description" content="unique">',
      bodyTags: '',
      bodyTagsOpen: '',
      htmlAttrs: '',
      bodyAttrs: '',
    })
  })

  it('memoizes repeat renders of a shared unique plan with fresh payload objects', () => {
    const plan: PrecompiledUniqueHeadInput = [[10, '<title>Unique</title>']]
    const first = { _p: [plan] }
    const second = { _p: [plan] }
    const payload = renderSSRHead(first)
    expect(renderSSRHead(first)).toEqual(payload)
    expect(renderSSRHead(first)).not.toBe(payload)
    expect(renderSSRHead(second)).toEqual(payload)
  })

  it('renders and disposes a unique client plan', () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    const head = createClientHead()
    const entry = head.push([
      [10, 'title', 'title', {}, 'Unique'],
      [100, 'meta:description', 'meta', { name: 'description', content: 'unique' }],
    ])

    expect(document.title).toBe('Unique')
    expect(document.head.querySelector('meta')?.getAttribute('content')).toBe('unique')
    entry.dispose()
    expect(document.head.querySelector('meta')).toBeNull()
  })
})
