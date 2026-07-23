// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { computed, nextTick, ref } from 'vue'
import { useDom } from '../../../../unhead/test/fixtures'
import { createHead, renderDOMHead } from '../../../src/client'

describe('vue head.push reactivity', () => {
  it('resolves and updates a ref input', async () => {
    const dom = useDom()
    const input = ref({ title: 'Initial' })
    const head = createHead({ document: dom.window.document })

    const entry = head.push(input)
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Initial')

    input.value = { title: 'Updated' }
    await nextTick()
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Updated')

    entry.dispose()
  })

  it('resolves and updates a computed input', async () => {
    const dom = useDom()
    const title = ref('Initial')
    const head = createHead({ document: dom.window.document })

    const entry = head.push(computed(() => ({ title: title.value })))
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Initial')

    title.value = 'Updated'
    await nextTick()
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Updated')

    entry.dispose()
  })

  it('resolves and updates a getter input', async () => {
    const dom = useDom()
    const title = ref('Initial')
    const head = createHead({ document: dom.window.document })

    const entry = head.push(() => ({ title: title.value }))
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Initial')

    title.value = 'Updated'
    await nextTick()
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Updated')

    entry.dispose()
  })

  it('replaces the reactive source when patched', async () => {
    const dom = useDom()
    const initialTitle = ref('Initial')
    const patchedTitle = ref('Patched')
    const initialGetter = vi.fn(() => ({ title: initialTitle.value }))
    const patchedGetter = vi.fn(() => ({ title: patchedTitle.value }))
    const head = createHead({ document: dom.window.document })
    const entry = head.push(computed(initialGetter))

    entry.patch(computed(patchedGetter))
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Patched')
    expect(initialGetter).toHaveBeenCalledOnce()
    expect(patchedGetter).toHaveBeenCalledOnce()

    initialTitle.value = 'Ignored'
    patchedTitle.value = 'Updated'
    await nextTick()
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Updated')
    expect(initialGetter).toHaveBeenCalledOnce()
    expect(patchedGetter).toHaveBeenCalledTimes(2)

    entry.patch({ title: 'Static' })
    patchedTitle.value = 'Ignored'
    await nextTick()
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Static')
    expect(patchedGetter).toHaveBeenCalledTimes(2)

    entry.dispose()
  })

  it('stops watching the reactive source on dispose', async () => {
    const dom = useDom()
    const title = ref('Initial')
    const getter = vi.fn(() => ({ title: title.value }))
    const head = createHead({ document: dom.window.document })
    const entry = head.push(computed(getter))

    await renderDOMHead(head, { document: dom.window.document })
    expect(getter).toHaveBeenCalledOnce()

    entry.dispose()
    title.value = 'Ignored'
    await nextTick()

    expect(getter).toHaveBeenCalledOnce()
    expect(head.entries.size).toBe(0)
  })
})
