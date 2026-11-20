// @vitest-environment jsdom
import { createEffect, createRoot, createSignal, flush } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { useHead, useHeadSafe, useScript, useSeoMeta } from '../src'
import { createHead, renderDOMHead } from '../src/client'

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

  it('keeps a patch applied before the first Solid flush', () => {
    const document = window.document.implementation.createHTMLDocument()
    const head = createHead({ document, render: renderDOMHead })

    const dispose = createRoot((dispose) => {
      const entry = useHead({ title: 'Initial' }, { head })
      entry.patch({ title: 'Updated' })
      return dispose
    })
    flush()

    expect(document.title).toBe('Updated')
    dispose()
  })

  it('patches the rendered title when a Solid signal changes', () => {
    const document = window.document.implementation.createHTMLDocument()
    const head = createHead({ document, render: renderDOMHead })
    const [title, setTitle] = createSignal('Initial')

    const dispose = createRoot((dispose) => {
      const entry = useHead({ title: 'Initial' }, { head })
      createEffect(title, value => entry.patch({ title: value }))
      return dispose
    })

    setTitle('Updated')
    flush()
    expect(document.title).toBe('Updated')

    dispose()
    expect(document.title).toBe('')
  })

  it('starts the default script trigger when Solid settles', () => {
    const document = window.document.implementation.createHTMLDocument()
    const head = createHead({ document, render: renderDOMHead })
    const src = 'https://example.test/solid.js'

    const dispose = createRoot((dispose) => {
      useScript(src, { head })
      expect(document.querySelector('script')).toBeNull()
      return dispose
    })
    flush()

    expect(document.querySelector('script')?.src).toBe(src)
    dispose()
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
