import type { PrecompiledClientHead } from '../../src/precompiled/client'
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

  it('renders and disposes a unique client plan', () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
    vi.stubGlobal('document', dom.window.document)
    // The hidden flag is emitted only by the strict compiler; source users
    // still see the zero-argument createHead contract.
    const head = (createClientHead as (unique: 1) => PrecompiledClientHead)(1)
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
