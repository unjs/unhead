import { describe, expect, it } from 'vitest'
import { createDebouncedFn, createDomRenderer } from '../../../src/client'
import { createHead } from '../../../src/client/createHead'
import { useDelayedSerializedDom, useDom, useDOMHead } from '../../util'

describe('patch timing', () => {
  it('processes pending patches even when dirty is false', async () => {
    const head = useDOMHead()

    // Initial push with style
    const entry = head.push({
      style: [{ innerHTML: '.initial { color: red; }' }],
    })

    await useDelayedSerializedDom()

    // Manually set dirty to false to simulate render completion
    head.dirty = false

    // Patch with new style - this sets _pending but dirty was just cleared
    entry.patch({
      style: [{ innerHTML: '.updated { color: blue; }' }],
    })

    // Verify the pending patch was processed
    const result = await useDelayedSerializedDom()
    expect(result).toContain('.updated { color: blue; }')
    expect(result).not.toContain('.initial { color: red; }')
  })

  it('handles rapid patches during render cycle', async () => {
    const head = useDOMHead()

    const entry = head.push({
      meta: [{ name: 'description', content: 'initial' }],
    })

    // Rapidly patch multiple times
    entry.patch({ meta: [{ name: 'description', content: 'update1' }] })
    entry.patch({ meta: [{ name: 'description', content: 'update2' }] })
    entry.patch({ meta: [{ name: 'description', content: 'final' }] })

    const result = await useDelayedSerializedDom()
    expect(result).toContain('content="final"')
    expect(result).not.toContain('content="initial"')
  })

  it('renders new tags after old tags removed', async () => {
    const head = useDOMHead()

    // Start with a style tag
    const entry = head.push({
      style: [{ innerHTML: 'body { background: white; }' }],
    })

    await useDelayedSerializedDom()

    // Patch to empty (simulating loading state)
    entry.patch({})

    await useDelayedSerializedDom()

    // Patch with new style (simulating async completion)
    entry.patch({
      style: [{ innerHTML: 'body { background: black; }' }],
    })

    const result = await useDelayedSerializedDom()
    expect(result).toContain('body { background: black; }')
  })

  // Issue #530: Reproduces the exact race condition with debounced renderer
  it('issue 530: patch during debounced render cycle', async () => {
    const dom = useDom()
    const domRenderer = createDomRenderer({ document: dom.window.document })

    // Create head with debounced renderer (like Vue does)
    const head = createHead({
      document: dom.window.document,
      render: createDebouncedFn(() => domRenderer(head), fn => setTimeout(fn, 0)),
    })

    // Initial push - simulates SSR hydration
    const entry = head.push({
      style: [{ innerHTML: '.ssr-style { color: red; }' }],
    })

    // Wait for initial render
    await new Promise(r => setTimeout(r, 10))
    expect(dom.serialize()).toContain('.ssr-style { color: red; }')

    // Simulate computedAsync: first patch to empty (loading state)
    entry.patch({})
    await new Promise(r => setTimeout(r, 10))
    expect(dom.serialize()).not.toContain('.ssr-style')

    // Simulate computedAsync: async completes with new value
    // This is where the bug occurred - dirty was false, _pending was set
    entry.patch({
      style: [{ innerHTML: '.async-style { color: blue; }' }],
    })

    await new Promise(r => setTimeout(r, 10))

    // With fix: new style should be rendered
    expect(dom.serialize()).toContain('.async-style { color: blue; }')
  })

  // Issue #530: Simulates the exact race where render completes mid-patch
  it('issue 530: concurrent render clears dirty before debounced patch render', async () => {
    const dom = useDom()
    const domRenderer = createDomRenderer({ document: dom.window.document })

    let renderCount = 0
    const head = createHead({
      document: dom.window.document,
      render: createDebouncedFn(() => {
        renderCount++
        return domRenderer(head)
      }, fn => setTimeout(fn, 0)),
    })

    const entry = head.push({
      meta: [{ name: 'test', content: 'initial' }],
    })

    await new Promise(r => setTimeout(r, 10))
    expect(dom.serialize()).toContain('content="initial"')
    const initialRenderCount = renderCount

    // Force dirty = false to simulate a concurrent render completing
    head.dirty = false

    // Patch while dirty is false - sets _pending
    entry.patch({
      meta: [{ name: 'test', content: 'updated' }],
    })

    // The entry now has _pending but dirty might be false
    // The fix ensures we still render
    await new Promise(r => setTimeout(r, 10))

    expect(dom.serialize()).toContain('content="updated"')
    expect(renderCount).toBeGreaterThan(initialRenderCount)
  })
})
