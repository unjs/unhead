// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { computed, nextTick, ref } from 'vue'
import { useDom } from '../../../../unhead/test/fixtures'
import { createHead, renderDOMHead } from '../../../src/client'

describe('vue head.push reactivity', () => {
  it('resolves and updates a computed input', async () => {
    const dom = useDom()
    const title = ref('Initial')
    const head = createHead({ document: dom.window.document })

    head.push(computed(() => ({ title: title.value })))
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Initial')

    title.value = 'Updated'
    await nextTick()
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Updated')
  })

  it('stops watching the computed input on dispose', async () => {
    const dom = useDom()
    const title = ref('Initial')
    const getter = vi.fn(() => ({ title: title.value }))
    const head = createHead({ document: dom.window.document })
    const entry = head.push(computed(getter))

    renderDOMHead(head, { document: dom.window.document })
    expect(getter).toHaveBeenCalledOnce()

    entry.dispose()
    title.value = 'Ignored'
    await nextTick()

    expect(getter).toHaveBeenCalledOnce()
    expect(head.entries.size).toBe(0)
  })

  it('replaces the reactive source when patch receives a computed input', async () => {
    const dom = useDom()
    const initialTitle = ref('Initial')
    const patchedTitle = ref('Patched')
    const head = createHead({ document: dom.window.document })
    const entry = head.push(computed(() => ({ title: initialTitle.value })))

    entry.patch(computed(() => ({ title: patchedTitle.value })))
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Patched')

    initialTitle.value = 'Ignored'
    patchedTitle.value = 'Updated'
    await nextTick()
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Updated')

    entry.patch({ title: 'Static' })
    patchedTitle.value = 'Ignored'
    await nextTick()
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Static')
  })
})
