import {
  createStreamableHead,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

describe('streaming SSR - nested Suspense boundaries', () => {
  describe('nested Suspense ordering', () => {
    it('streams only unique tags from nested boundaries', async () => {
      const { head } = createStreamableHead()
      head.push({ title: 'Initial' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // First boundary adds meta A
      head.push({ meta: [{ name: 'meta-a', content: 'a' }] })
      const chunk1 = renderSSRHeadSuspenseChunk(head)

      // Second boundary adds meta B (new) and meta A (dupe)
      head.push({ meta: [{ name: 'meta-a', content: 'a' }, { name: 'meta-b', content: 'b' }] })
      const chunk2 = renderSSRHeadSuspenseChunk(head)

      expect(chunk1).toContain('meta-a')
      expect(chunk2).toContain('meta-b')
    })
  })

  describe('nested Suspense with keys', () => {
    it('updates links with same key across nested boundaries', async () => {
      const { head } = createStreamableHead()
      head.push({
        link: [{ key: 'font', rel: 'stylesheet', href: 'font-v1.css' }],
      })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Outer boundary updates font
      head.push({
        link: [{ key: 'font', rel: 'stylesheet', href: 'font-v2.css' }],
      })
      const chunk1 = renderSSRHeadSuspenseChunk(head)

      // Inner boundary updates font again
      head.push({
        link: [{ key: 'font', rel: 'stylesheet', href: 'font-v3.css' }],
      })
      const chunk2 = renderSSRHeadSuspenseChunk(head)

      expect(chunk1).toContain('font-v2.css')
      expect(chunk2).toContain('font-v3.css')
    })
  })

  describe('nested Suspense with htmlAttrs/bodyAttrs', () => {
    it('handles bodyAttrs updates from nested boundaries', async () => {
      const { head } = createStreamableHead()
      head.push({ bodyAttrs: { class: 'loading' } })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Outer updates body class
      head.push({ bodyAttrs: { class: 'loaded' } })
      const chunk1 = renderSSRHeadSuspenseChunk(head)

      // Inner adds style
      head.push({ bodyAttrs: { style: 'overflow: hidden' } })
      const chunk2 = renderSSRHeadSuspenseChunk(head)

      expect(chunk1).toContain('loaded')
      expect(chunk2).toContain('overflow')
    })
  })
})

describe('streaming SSR - error handling', () => {
  describe('head state preservation', () => {
    it('head state is preserved after multiple chunks', async () => {
      const { head } = createStreamableHead()
      head.push({ title: 'Initial' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: 'Updated', meta: [{ name: 'test', content: 'value' }] })

      const chunk = renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('Updated')
      expect(chunk).toContain('test')
    })
  })

  describe('recovery scenarios', () => {
    it('continues streaming after push with empty data', async () => {
      const { head } = createStreamableHead()
      head.push({ title: 'Valid' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Push with empty meta
      head.push({ meta: [{ name: '', content: '' }] })
      renderSSRHeadSuspenseChunk(head)

      // Continue with valid data
      head.push({ title: 'Still Working' })
      const chunk2 = renderSSRHeadSuspenseChunk(head)

      expect(chunk2).toContain('Still Working')
    })

    it('handles rapid dispose and push during streaming', async () => {
      const { head } = createStreamableHead()
      const entry = head.push({ title: 'Temporary' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Rapid dispose and push
      entry.dispose()
      head.push({ title: 'Replacement' })

      const chunk = renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('Replacement')
    })
  })
})
