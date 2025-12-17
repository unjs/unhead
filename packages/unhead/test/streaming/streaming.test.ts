import { describe, expect, it } from 'vitest'
import {
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamAppWithUnhead,
} from '../../src/server'
import { createServerHeadWithContext, createStreamableServerHead } from '../util'

describe('streaming SSR', () => {
  describe('renderSSRHeadShell', () => {
    it('renders initial head tags into shell', async () => {
      const head = createServerHeadWithContext()
      head.push({
        title: 'Test Page',
        meta: [{ name: 'description', content: 'Test description' }],
      })

      const template = '<!DOCTYPE html><html><head></head><body>'
      const result = await renderSSRHeadShell(head, template)

      expect(result).toContain('<title>Test Page</title>')
      expect(result).toContain('<meta name="description" content="Test description">')
      expect(result).toContain('window.__unhead__')
    })

    it('applies html and body attrs', async () => {
      const head = createServerHeadWithContext()
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

    it('initializes _streamedHashes set', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      expect(head._streamedHashes).toBeInstanceOf(Set)
      expect(head._streamedHashes!.size).toBeGreaterThan(0)
    })
  })

  describe('renderSSRHeadSuspenseChunk', () => {
    it('returns empty string when no new tags', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Test' })

      // Initialize streaming state
      await renderSSRHeadShell(head, '<html><head></head><body>')

      // No new tags added
      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toBe('')
    })

    it('returns push script for new tags', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Initial' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Add new tags (simulating async component)
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
      const head = createServerHeadWithContext()
      head.push({ title: 'Initial', meta: [{ name: 'robots', content: 'index' }] })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Add only new meta, title unchanged
      head.push({ meta: [{ name: 'author', content: 'Test' }] })

      const result = await renderSSRHeadSuspenseChunk(head)

      expect(result).toContain('author')
      expect(result).not.toContain('robots') // Already streamed
    })
  })

  describe('renderSSRHeadClosing', () => {
    it('returns body tags', async () => {
      const head = createServerHeadWithContext()
      head.push({
        script: [{ src: 'analytics.js', tagPosition: 'bodyClose' }],
      })

      const result = await renderSSRHeadClosing(head)

      expect(result).toContain('<script src="analytics.js"></script>')
    })
  })

  describe('streamAppWithUnhead', () => {
    async function* mockAppStream(chunks: string[]): AsyncGenerator<string> {
      for (const chunk of chunks) {
        yield chunk
      }
    }

    it('streams app with head injection', async () => {
      const head = createServerHeadWithContext()
      head.push({
        title: 'Streamed Page',
        meta: [{ name: 'description', content: 'A streamed page' }],
      })

      const template = '<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>'
      const appChunks = ['<div>Hello</div>', '<div>World</div>']

      const chunks: string[] = []
      for await (const chunk of streamAppWithUnhead(mockAppStream(appChunks), template, head)) {
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
      const head = createServerHeadWithContext()
      head.push({ title: 'Initial' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      // Simulate: first chunk, then async component resolves with marker
      async function* appWithSuspense(): AsyncGenerator<string> {
        yield '<div>App Shell</div>'
        // Simulate async component adding head
        head.push({ title: 'Async Title', meta: [{ name: 'async', content: 'true' }] })
        yield '<div><script><!--[unhead-ssr]--></script></div>'
      }

      const chunks: string[] = []
      for await (const chunk of streamAppWithUnhead(appWithSuspense(), template, head)) {
        chunks.push(chunk)
      }

      const fullHtml = chunks.join('')
      // Should have initial title in head
      expect(fullHtml).toContain('<title>Initial</title>')
      // Should have push script for async updates
      expect(fullHtml).toContain('window.__unhead__.push')
      expect(fullHtml).toContain('Async Title')
    })

    it('handles Uint8Array chunks', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Binary Test' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* binaryStream(): AsyncGenerator<Uint8Array> {
        yield new TextEncoder().encode('<div>Binary Content</div>')
      }

      const chunks: string[] = []
      for await (const chunk of streamAppWithUnhead(binaryStream(), template, head)) {
        chunks.push(chunk)
      }

      const fullHtml = chunks.join('')
      expect(fullHtml).toContain('<title>Binary Test</title>')
      expect(fullHtml).toContain('<div>Binary Content</div>')
    })
  })

  describe('tagsToSerializableHead', () => {
    it('serializes new link tags', async () => {
      const head = createServerHeadWithContext()

      await renderSSRHeadShell(head, '<html><head></head><body>')
      head.push({ link: [{ rel: 'stylesheet', href: 'new.css' }] })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('link')
      expect(result).toContain('new.css')
    })

    it('serializes new script tags', async () => {
      const head = createServerHeadWithContext()

      await renderSSRHeadShell(head, '<html><head></head><body>')
      head.push({ script: [{ src: 'analytics.js' }] })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('script')
      expect(result).toContain('analytics.js')
    })
  })

  describe('custom stream key', () => {
    it('uses custom key in bootstrap script', async () => {
      const head = createServerHeadWithContext({ experimentalStreamKey: '__myhead__' })
      head.push({ title: 'Test' })

      const result = await renderSSRHeadShell(head, '<html><head></head><body>')

      expect(result).toContain('window.__myhead__')
      expect(result).not.toContain('window.__unhead__')
    })

    it('uses custom key in suspense chunk', async () => {
      const head = createServerHeadWithContext({ experimentalStreamKey: '__custom__' })

      await renderSSRHeadShell(head, '<html><head></head><body>')
      head.push({ title: 'New Title' })

      const result = await renderSSRHeadSuspenseChunk(head)

      expect(result).toContain('window.__custom__.push')
    })

    it('supports multiple providers with different keys', async () => {
      const head1 = createServerHeadWithContext({ experimentalStreamKey: '__provider1__' })
      const head2 = createServerHeadWithContext({ experimentalStreamKey: '__provider2__' })

      head1.push({ title: 'Provider 1' })
      head2.push({ title: 'Provider 2' })

      const shell1 = await renderSSRHeadShell(head1, '<html><head></head><body>')
      const shell2 = await renderSSRHeadShell(head2, '<html><head></head><body>')

      expect(shell1).toContain('window.__provider1__')
      expect(shell2).toContain('window.__provider2__')
    })
  })

  describe('createStreamableHead', () => {
    it('creates head with _streamedHashes initialized', () => {
      const head = createStreamableServerHead()
      expect(head._streamedHashes).toBeInstanceOf(Set)
    })

    it('uses default stream key', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Test' })

      const result = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(result).toContain('window.__unhead__')
    })

    it('uses custom stream key', async () => {
      const head = createStreamableServerHead({ streamKey: '__custom__' })
      head.push({ title: 'Test' })

      const result = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(result).toContain('window.__custom__')
    })
  })
})
