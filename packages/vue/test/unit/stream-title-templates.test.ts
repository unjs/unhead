import { createStreamableHead, renderSSRHeadShell, renderSSRHeadSuspenseChunk } from '@unhead/vue/stream/server'
import { computed, ref } from 'vue'

describe('vue streamed title templates', () => {
  it('provides the title to callbacks inside title-template objects', () => {
    const { head } = createStreamableHead()
    head.push({ title: 'Vue', titleTemplate: computed(() => ({ textContent: (title?: string) => `${title} | Docs` })) })
    expect(renderSSRHeadShell(head, '<html><head></head><body>')).toContain('<title>Vue | Docs</title>')
  })

  it('serializes callback titles in late stream chunks', () => {
    const { head } = createStreamableHead()
    head.push({ title: 'Home' })
    renderSSRHeadShell(head, '<html><head></head><body>')
    head.push({ titleTemplate: ref(title => `${title} | Docs`) })
    expect(renderSSRHeadSuspenseChunk(head)).toContain('Home | Docs')
    head.push({ title: 'Vue' })
    expect(renderSSRHeadSuspenseChunk(head)).toContain('Vue | Docs')
  })

  it('preserves valid late entries when a title-template callback throws', () => {
    const { head } = createStreamableHead()
    head.push({ title: 'Docs', titleTemplate: (title) => {
      if (title === 'Late')
        throw new Error('Title template failed')
      return title ?? null
    } })
    renderSSRHeadShell(head, '<html><head></head><body>')
    head.push({ title: 'Late', meta: [{ name: 'description', content: 'Keep me' }] })
    expect(() => renderSSRHeadSuspenseChunk(head)).toThrow('Title template failed')
    expect(renderSSRHeadSuspenseChunk(head)).toContain('Keep me')
  })

  it('preserves the title when a callback from the same entry throws', () => {
    const { head } = createStreamableHead()
    head.push({ title: 'Docs', titleTemplate: () => {
      throw new Error('Title template failed')
    } })
    expect(() => renderSSRHeadSuspenseChunk(head)).toThrow('Title template failed')
    expect(renderSSRHeadSuspenseChunk(head)).toContain('"title":"Docs"')
  })

  it('keeps entries queued by a callback for the next stream chunk', () => {
    const { head } = createStreamableHead()
    head.push({ titleTemplate: () => {
      head.push({ meta: [{ name: 'description', content: 'From callback' }] })
      return 'Docs'
    } })
    expect(renderSSRHeadSuspenseChunk(head)).toContain('Docs')
    expect(renderSSRHeadSuspenseChunk(head)).toContain('From callback')
  })

  it('passes an absent title to a callback when title text resolves to null', () => {
    const { head } = createStreamableHead()
    head.push({
      title: { textContent: ref(null) },
      titleTemplate: title => title ? `${title} | Docs` : 'Untitled',
    })
    expect(renderSSRHeadSuspenseChunk(head)).toContain('Untitled')
  })
})
