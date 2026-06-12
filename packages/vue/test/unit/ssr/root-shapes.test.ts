import { renderSSRHead } from '@unhead/ssr'
import { useHead } from '@unhead/vue'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { ssrVueAppWithUnhead } from '../../util'

describe('root resolvable shapes', () => {
  it('ref root (vite-pwa #832)', async () => {
    const head = await ssrVueAppWithUnhead(() => {
      useHead(ref({ title: 'ref-root' }))
    })
    expect((await renderSSRHead(head)).headTags).toContain('ref-root')
  })
  it('ref-of-function root', async () => {
    const head = await ssrVueAppWithUnhead(() => {
      // @ts-expect-error runtime looseness
      useHead(ref(() => ({ title: 'ref-fn-root' })))
    })
    expect((await renderSSRHead(head)).headTags).toContain('ref-fn-root')
  })
})
