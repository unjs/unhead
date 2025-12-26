import { renderSSRHeadSuspenseChunk } from 'unhead'
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  createStreamableHead,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from '../src/stream/server'

describe('vue streaming SSR', () => {
  describe('createStreamableHead', () => {
    it('creates head with _streamedHashes initialized', () => {
      const head = createStreamableHead()
      expect(head._streamedHashes).toBeInstanceOf(Set)
    })

    it('uses custom stream key', async () => {
      const head = createStreamableHead({ streamKey: '__vue__' })
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__vue__')
    })

    it('uses default stream key', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__unhead__')
    })

    it('has install method for Vue app.use()', () => {
      const head = createStreamableHead()
      expect(typeof head.install).toBe('function')
    })
  })

  describe('renderSSRHeadShell', () => {
    it('renders initial head tags into shell', async () => {
      const head = createStreamableHead()
      head.push({
        title: 'Vue Streaming Test',
        meta: [{ name: 'description', content: 'Test description' }],
      })

      const template = '<!DOCTYPE html><html><head></head><body>'
      const result = await renderSSRHeadShell(head, template)

      expect(result).toContain('<title>Vue Streaming Test</title>')
      expect(result).toContain('<meta name="description" content="Test description">')
      expect(result).toContain('window.__unhead__')
    })

    it('applies html and body attrs', async () => {
      const head = createStreamableHead()
      head.push({
        htmlAttrs: { lang: 'en', dir: 'ltr' },
        bodyAttrs: { class: 'dark' },
      })

      const template = '<html><head></head><body>'
      const result = await renderSSRHeadShell(head, template)

      expect(result).toContain('lang="en"')
      expect(result).toContain('dir="ltr"')
      expect(result).toContain('class="dark"')
    })
  })

  describe('renderSSRHeadSuspenseChunk', () => {
    it('returns empty string when no new tags', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Test' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toBe('')
    })

    it('returns push script for new tags', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Initial' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        title: 'Updated Title',
        meta: [{ name: 'description', content: 'New description' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)

      expect(result).toContain('window.__unhead__.push')
      expect(result).toContain('Updated Title')
      expect(result).toContain('New description')
    })

    it('only includes new tags not previously streamed', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Initial', meta: [{ name: 'robots', content: 'index' }] })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ meta: [{ name: 'author', content: 'Test' }] })

      const result = await renderSSRHeadSuspenseChunk(head)

      expect(result).toContain('author')
      expect(result).not.toContain('robots')
    })
  })

  describe('renderSSRHeadSuspenseChunk', () => {
    it('returns push script for new tags synchronously', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Initial' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: 'Updated' })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('Updated')
    })

    it('returns empty string when no new tags', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Test' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toBe('')
    })
  })

  describe('streamWithHead', () => {
    async function* mockAppStream(chunks: string[]): AsyncGenerator<string> {
      for (const chunk of chunks) {
        yield chunk
      }
    }

    it('streams app with head injection', async () => {
      const head = createStreamableHead()
      head.push({
        title: 'Streamed Page',
        meta: [{ name: 'description', content: 'A streamed page' }],
      })

      const template = '<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>'
      const appChunks = ['<div>Hello</div>', '<div>World</div>']

      const chunks: string[] = []
      for await (const chunk of streamWithHead(mockAppStream(appChunks), template, head)) {
        chunks.push(chunk)
      }

      const fullHtml = chunks.join('')
      expect(fullHtml).toContain('<title>Streamed Page</title>')
      expect(fullHtml).toContain('window.__unhead__')
      expect(fullHtml).toContain('<div>Hello</div>')
      expect(fullHtml).toContain('<div>World</div>')
      expect(fullHtml).toContain('</body></html>')
    })
  })

  describe('xSS prevention', () => {
    it('escapes script tags in content', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        title: '<script>alert("xss")</script>',
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).not.toContain('<script>alert')
      expect(result).toContain('\\u003c')
    })

    it('escapes closing script tags', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{ innerHTML: '</script><script>evil()</script>' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).not.toContain('</script><script>')
    })
  })

  describe('multiple providers', () => {
    it('supports different stream keys', async () => {
      const head1 = createStreamableHead({ streamKey: '__vue1__' })
      const head2 = createStreamableHead({ streamKey: '__vue2__' })

      head1.push({ title: 'Provider 1' })
      head2.push({ title: 'Provider 2' })

      const shell1 = await renderSSRHeadShell(head1, '<html><head></head><body>')
      const shell2 = await renderSSRHeadShell(head2, '<html><head></head><body>')

      expect(shell1).toContain('window.__vue1__')
      expect(shell1).toContain('Provider 1')
      expect(shell2).toContain('window.__vue2__')
      expect(shell2).toContain('Provider 2')
    })
  })

  describe('unicode and special characters', () => {
    it('handles emoji in title', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Vue App' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Vue App')
    })

    it('handles unicode in meta', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'description', content: 'Vue' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('Vue')
    })

    it('handles CJK characters', async () => {
      const head = createStreamableHead()
      head.push({
        title: 'Vue',
        meta: [{ name: 'description', content: 'Vue' }],
      })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('<title>Vue</title>')
    })
  })

  describe('vue reactivity', () => {
    it('handles ref-like values being resolved', async () => {
      const head = createStreamableHead()

      // Vue resolver should handle refs - testing with plain object that has .value
      head.push({
        title: { value: 'Ref Title' } as any,
      })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Ref Title')
    })

    it('handles computed-like values being resolved', async () => {
      const head = createStreamableHead()

      head.push({
        title: () => 'Computed Title',
      })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Computed Title')
    })
  })
})
