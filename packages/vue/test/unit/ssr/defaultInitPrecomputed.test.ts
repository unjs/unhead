import { renderSSRHead } from '@unhead/ssr'
import { createHead } from '@unhead/vue/server'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

describe('vue ssr default init precomputed tags', () => {
  it('vueResolver is marked _static so the default entry gets precomputed tags', () => {
    const head = createHead()
    expect(head.entries.get(1)?._precomputedTags).toBeDefined()
  })

  it('output is byte-identical with the fast path vs forced off', () => {
    const input = {
      title: ref('Harlan Wilton'),
      htmlAttrs: { lang: ref('de') },
      meta: [{ name: 'description', content: 'hello' }],
    }
    const fast = createHead()
    const slow = createHead()
    // force the normalize path
    delete slow.entries.get(1)!._precomputedTags
    fast.push(input)
    slow.push(input)
    expect(renderSSRHead(fast)).toEqual(renderSSRHead(slow))
    expect(renderSSRHead(fast).htmlAttrs).toBe(' lang="de"')
  })

  it('fast path never exposes the shared array via _tags', () => {
    const head = createHead()
    renderSSRHead(head)
    expect(head.entries.get(1)!._tags).toBeUndefined()
  })
})
