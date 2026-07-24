// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { computed, nextTick, ref } from 'vue'
import { useDom } from '../../../../unhead/test/fixtures'
import { createHead, renderDOMHead } from '../../../src/client'

describe('vue head.push resolver', () => {
  it('resolves top-level and nested refs when rendering', async () => {
    const dom = useDom()
    const head = createHead({
      document: dom.window.document,
      domOptions: {
        render: () => {},
      },
    })

    head.push(ref({
      title: ref('Initial'),
    }))
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('Initial')
  })

  it('composes custom prop resolvers after Vue refs', async () => {
    const dom = useDom()
    const head = createHead({
      document: dom.window.document,
      domOptions: {
        render: () => {},
      },
      propResolvers: [
        (_, value) => typeof value === 'string' ? value.toUpperCase() : value,
      ],
    })

    head.push({
      title: ref('Resolved'),
    })
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toBe('RESOLVED')
  })

  it('resolves computed inputs lazily without subscribing', async () => {
    const dom = useDom()
    const title = ref('Initial')
    const getter = vi.fn(() => ({ title: title.value }))
    const head = createHead({
      document: dom.window.document,
      domOptions: {
        render: () => {},
      },
    })

    head.push(computed(getter))
    await renderDOMHead(head, { document: dom.window.document })
    expect(getter).toHaveBeenCalledOnce()
    expect(dom.window.document.title).toBe('Initial')

    title.value = 'Updated'
    await nextTick()
    expect(getter).toHaveBeenCalledOnce()
    expect(dom.window.document.title).toBe('Initial')

    head.invalidate()
    await renderDOMHead(head, { document: dom.window.document })
    expect(getter).toHaveBeenCalledTimes(2)
    expect(dom.window.document.title).toBe('Updated')
  })
})
