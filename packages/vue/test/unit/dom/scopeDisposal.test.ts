// @vitest-environment jsdom

import { useHead } from '@unhead/vue'
import { createHead, renderDOMHead } from '@unhead/vue/client'
import { describe, expect, it } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'

describe('scope disposal', () => {
  it('removes head tags when a scope without a VDOM instance stops', async () => {
    const head = createHead({ document })
    const parent = head.push({ title: 'parent' })
    const scope = effectScope()
    const title = ref('child')

    scope.run(() => useHead({
      title,
      meta: [{ name: 'robots', content: 'noindex' }],
    }, { head }))

    try {
      renderDOMHead(head, { document })
      expect(document.title).toBe('child')
      expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex')

      title.value = 'updated child'
      await nextTick()
      renderDOMHead(head, { document })
      expect(document.title).toBe('updated child')

      scope.stop()
      renderDOMHead(head, { document })
      expect(document.title).toBe('parent')
      expect(document.querySelector('meta[name="robots"]')).toBeNull()

      title.value = 'stopped child'
      await nextTick()
      renderDOMHead(head, { document })
      expect(document.title).toBe('parent')
    }
    finally {
      scope.stop()
      parent.dispose()
      renderDOMHead(head, { document })
    }
  })
})
