import { renderSSRHeadSuspenseChunkSync, STREAM_MARKER } from 'unhead/server'
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  createStreamableHead,
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from '../src/server'

// Helper to create a mock async stream
async function* mockStream(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) {
    yield chunk
  }
}

// Helper to collect async generator into array
async function collectStream(stream: AsyncGenerator<string>): Promise<string[]> {
  const results: string[] = []
  for await (const chunk of stream) {
    results.push(chunk)
  }
  return results
}

describe('solid-js streaming SSR e2e', () => {
  describe('full streaming workflow', () => {
    it('streams initial head tags in shell', async () => {
      const head = createStreamableHead()

      // Push initial head tags (simulating pre-render setup)
      head.push({
        title: 'Initial Title',
        meta: [{ name: 'description', content: 'Initial description' }],
      })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      expect(shell).toContain('<title>Initial Title</title>')
      expect(shell).toContain('name="description"')
      expect(shell).toContain('Initial description')
      expect(shell).toContain('window.__unhead__')
    })

    it('streams head updates with suspense chunks', async () => {
      const head = createStreamableHead()

      // Initial head
      head.push({ title: 'Loading...' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      // Render shell
      const shell = await renderSSRHeadShell(head, htmlStart)
      expect(shell).toContain('<title>Loading...</title>')

      // Simulate async component resolving with new head
      head.push({
        title: 'Loaded Title',
        meta: [{ name: 'async', content: 'loaded' }],
      })

      // Get the suspense chunk
      const chunk = await renderSSRHeadSuspenseChunk(head)

      expect(chunk).toContain('Loaded Title')
      expect(chunk).toContain('window.__unhead__.push')

      // Close
      const closing = await renderSSRHeadClosing(head)
      const fullHtml = `${shell}<div>Content</div>` + `<script>${chunk}</script>${closing}${htmlEnd}`

      expect(fullHtml).toContain('<!DOCTYPE html>')
      expect(fullHtml).toContain('</html>')
    })

    it('handles multiple suspense boundaries', async () => {
      const head = createStreamableHead()

      head.push({ title: 'Multi-Suspense Test' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      // First suspense resolves
      head.push({
        meta: [{ property: 'og:title', content: 'First Component' }],
      })
      const chunk1 = await renderSSRHeadSuspenseChunk(head)
      expect(chunk1).toContain('First Component')

      // Second suspense resolves
      head.push({
        meta: [{ property: 'og:description', content: 'Second Component' }],
      })
      const chunk2 = await renderSSRHeadSuspenseChunk(head)
      expect(chunk2).toContain('Second Component')

      const closing = await renderSSRHeadClosing(head)
      const fullHtml = `${shell}<script>${chunk1}</script>` + `<script>${chunk2}</script>${closing}${htmlEnd}`

      expect(fullHtml).toContain('First Component')
      expect(fullHtml).toContain('Second Component')
    })

    it('escapes XSS in head content', async () => {
      const head = createStreamableHead()

      head.push({
        title: '</script><script>alert("xss")</script>',
      })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      expect(shell).toContain('<title>')
      expect(shell).not.toMatch(/<title>.*<script>alert.*<\/title>/i)
    })

    it('handles nested suspense with head updates', async () => {
      const head = createStreamableHead()

      head.push({ title: 'Nested Test', htmlAttrs: { lang: 'en' } })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)
      expect(shell).toContain('<title>Nested Test</title>')
      expect(shell).toContain('lang="en"')

      // Outer suspense resolves
      head.push({
        meta: [{ name: 'outer', content: 'outer-data' }],
      })
      const outerChunk = await renderSSRHeadSuspenseChunk(head)

      // Inner suspense resolves
      head.push({
        meta: [{ name: 'inner', content: 'inner-data' }],
      })
      const innerChunk = await renderSSRHeadSuspenseChunk(head)

      const closing = await renderSSRHeadClosing(head)
      const fullHtml = `${shell}<script>${outerChunk}</script>` + `<script>${innerChunk}</script>${closing}${htmlEnd}`

      expect(fullHtml).toContain('outer-data')
      expect(fullHtml).toContain('inner-data')
    })
  })

  describe('streamWithHead', () => {
    it('processes app stream with head updates', async () => {
      const head = createStreamableHead()

      head.push({ title: 'Stream Test' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`

      const appChunks = [
        '<div>Shell Content</div>',
        `<div>Async Content</div><script>${STREAM_MARKER}</script>`,
      ]

      // Add head update before second chunk
      head.push({ meta: [{ name: 'streamed', content: 'yes' }] })

      const outputChunks = await collectStream(
        streamWithHead(mockStream(appChunks), template, head),
      )

      const fullHtml = outputChunks.join('')

      expect(fullHtml).toContain('<title>Stream Test</title>')
      expect(fullHtml).toContain('Shell Content')
      expect(fullHtml).toContain('Async Content')
      expect(fullHtml).toContain('window.__unhead__')
    })

    it('replaces STREAM_MARKER with head updates', async () => {
      const head = createStreamableHead()

      head.push({ title: 'Marker Test' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`

      // First chunk triggers shell
      const chunk1 = '<div>Initial</div>'
      // Second chunk has marker
      const chunk2 = `<div>Loaded</div><script>${STREAM_MARKER}</script>`

      const outputChunks = await collectStream(
        streamWithHead(mockStream([chunk1, chunk2]), template, head),
      )

      // Add update after shell renders
      head.push({ meta: [{ name: 'loaded', content: 'true' }] })

      const fullHtml = outputChunks.join('')

      // STREAM_MARKER should be replaced (or empty if no new tags)
      expect(fullHtml).not.toContain('__UNHEAD_SSR__')
    })

    it('appends body close tags', async () => {
      const head = createStreamableHead()

      head.push({
        script: [{ src: 'analytics.js', tagPosition: 'bodyClose' }],
      })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`

      const outputChunks = await collectStream(
        streamWithHead(mockStream(['<div>Content</div>']), template, head),
      )

      const fullHtml = outputChunks.join('')

      expect(fullHtml).toContain('analytics.js')
      expect(fullHtml).toContain('</body></html>')
    })
  })

  describe('sync rendering', () => {
    it('renderSSRHeadSuspenseChunkSync returns update synchronously', () => {
      const head = createStreamableHead()

      head.push({ title: 'Initial' })

      // Mark as streamed first
      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')
      renderSSRHeadShell(head, htmlStart)

      // Add new head entry
      head.push({ title: 'Updated' })

      const syncResult = renderSSRHeadSuspenseChunkSync(head)

      expect(syncResult).toContain('Updated')
    })

    it('returns empty when no updates', async () => {
      const head = createStreamableHead()

      head.push({ title: 'Static' })

      // Stream the shell
      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')
      await renderSSRHeadShell(head, htmlStart)

      // No new entries - should return empty
      const result = await renderSSRHeadSuspenseChunk(head)

      expect(result).toBe('')
    })
  })

  describe('custom stream key', () => {
    it('uses custom window key', async () => {
      const head = createStreamableHead({ streamKey: '__solid_head__' })

      head.push({ title: 'Custom Key Test' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      expect(shell).toContain('window.__solid_head__')
      expect(shell).not.toContain('window.__unhead__=')
    })
  })

  describe('body-positioned tags', () => {
    it('includes bodyClose scripts in closing', async () => {
      const head = createStreamableHead()

      head.push({
        script: [
          { src: 'app.js' },
          { src: 'analytics.js', tagPosition: 'bodyClose' },
        ],
      })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)
      const closing = await renderSSRHeadClosing(head)

      // Head script should be in shell
      expect(shell).toContain('app.js')
      // Body script should be in closing
      expect(closing).toContain('analytics.js')
    })
  })

  describe('error handling', () => {
    it('handles empty head gracefully', async () => {
      const head = createStreamableHead()

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      expect(shell).toContain('<head>')
      expect(shell).toContain('window.__unhead__')
    })

    it('handles unicode content', async () => {
      const head = createStreamableHead()

      head.push({
        title: '日本語タイトル',
        meta: [{ name: 'description', content: 'Descripción en español' }],
      })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      expect(shell).toContain('日本語タイトル')
      expect(shell).toContain('Descripción en español')
    })
  })
})
