// @vitest-environment jsdom
import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { useHead, useHeadSafe, useSeoMeta } from '../src'
import { createHead } from '../src/client'

// Guards the shared withSideEffects disposal path used by useHead, useHeadSafe
// and useSeoMeta: the entry must be removed when its Solid owner is disposed.
describe('solid head composables lifecycle', () => {
  it('disposes a useHead entry when the owner is disposed', () => {
    const head = createHead()
    let dispose!: () => void

    createRoot((d) => {
      dispose = d
      useHead({
        title: 'Solid',
        meta: [{ name: 'description', content: 'solid description' }],
      }, { head })
    })

    expect(head.entries.size).toBe(1)

    dispose()
    expect(head.entries.size).toBe(0)
  })

  it('disposes useSeoMeta and useHeadSafe entries when the owner is disposed', () => {
    const head = createHead()
    let dispose!: () => void

    createRoot((d) => {
      dispose = d
      useSeoMeta({ title: 'SEO', description: 'seo description' }, { head })
      useHeadSafe({ meta: [{ name: 'safe', content: 'value' }] }, { head })
    })

    expect(head.entries.size).toBe(2)

    dispose()
    expect(head.entries.size).toBe(0)
  })

  it('only disposes the entry owned by the disposed root', () => {
    const head = createHead()
    let disposeInner!: () => void

    createRoot(() => {
      useHead({ title: 'Outer' }, { head })
      createRoot((d) => {
        disposeInner = d
        useHead({ title: 'Inner' }, { head })
      })
    })

    expect(head.entries.size).toBe(2)

    // disposing the inner owner must leave the outer entry intact
    disposeInner()
    expect(head.entries.size).toBe(1)
  })
})
