import { renderSSRHeadSuspenseChunkSync, STREAM_MARKER } from 'unhead'
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  createStreamableHead,
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from '../src/server'

describe('svelte streaming SSR', () => {
  describe('createStreamableHead', () => {
    it('creates head with _streamedHashes initialized', () => {
      const head = createStreamableHead()
      expect(head._streamedHashes).toBeInstanceOf(Set)
    })

    it('uses custom stream key', async () => {
      const head = createStreamableHead({ streamKey: '__svelte__' })
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__svelte__')
    })

    it('uses default stream key', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__unhead__')
    })
  })

  describe('renderSSRHeadShell', () => {
    it('renders initial head tags into shell', async () => {
      const head = createStreamableHead()
      head.push({
        title: 'Svelte Streaming Test',
        meta: [{ name: 'description', content: 'Test description' }],
      })

      const template = '<!DOCTYPE html><html><head></head><body>'
      const result = await renderSSRHeadShell(head, template)

      expect(result).toContain('<title>Svelte Streaming Test</title>')
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

  describe('renderSSRHeadSuspenseChunkSync', () => {
    it('returns push script for new tags synchronously', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Initial' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: 'Updated' })

      const result = renderSSRHeadSuspenseChunkSync(head)
      expect(result).toContain('Updated')
    })

    it('returns empty string when no new tags', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Test' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      const result = renderSSRHeadSuspenseChunkSync(head)
      expect(result).toBe('')
    })
  })

  describe('renderSSRHeadClosing', () => {
    it('returns body tags', async () => {
      const head = createStreamableHead()
      head.push({
        script: [{ src: 'analytics.js', tagPosition: 'bodyClose' }],
      })

      const result = await renderSSRHeadClosing(head)
      expect(result).toContain('<script src="analytics.js"></script>')
    })
  })

  describe('sTREAM_MARKER', () => {
    it('exports STREAM_MARKER constant', () => {
      expect(STREAM_MARKER).toBeDefined()
      expect(typeof STREAM_MARKER).toBe('string')
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

    it('processes suspense markers', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Initial' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* appWithSuspense(): AsyncGenerator<string> {
        yield '<div>App Shell</div>'
        head.push({ title: 'Async Title', meta: [{ name: 'async', content: 'true' }] })
        yield `<div><script>${STREAM_MARKER}</script></div>`
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(appWithSuspense(), template, head)) {
        chunks.push(chunk)
      }

      const fullHtml = chunks.join('')
      expect(fullHtml).toContain('<title>Initial</title>')
      expect(fullHtml).toContain('window.__unhead__.push')
      expect(fullHtml).toContain('Async Title')
      expect(fullHtml).not.toContain(STREAM_MARKER)
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
      const head1 = createStreamableHead({ streamKey: '__svelte1__' })
      const head2 = createStreamableHead({ streamKey: '__svelte2__' })

      head1.push({ title: 'Provider 1' })
      head2.push({ title: 'Provider 2' })

      const shell1 = await renderSSRHeadShell(head1, '<html><head></head><body>')
      const shell2 = await renderSSRHeadShell(head2, '<html><head></head><body>')

      expect(shell1).toContain('window.__svelte1__')
      expect(shell1).toContain('Provider 1')
      expect(shell2).toContain('window.__svelte2__')
      expect(shell2).toContain('Provider 2')
    })
  })

  describe('unicode and special characters', () => {
    it('handles emoji in title', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Svelte App 🎉' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Svelte App 🎉')
    })

    it('handles unicode in meta', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'description', content: '日本語テスト' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('日本語テスト')
    })
  })
})
