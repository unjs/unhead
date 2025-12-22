import { renderSSRHeadSuspenseChunkSync } from 'unhead'
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  createStreamableHead,
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  streamWithHead,
} from '../src/stream/server'

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

describe('svelte streaming SSR e2e', () => {
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

    it('streams head updates with await chunks', async () => {
      const head = createStreamableHead()

      // Initial head
      head.push({ title: 'Loading...' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      // Render shell
      const shell = await renderSSRHeadShell(head, htmlStart)
      expect(shell).toContain('<title>Loading...</title>')

      // Simulate {#await} block resolving with new head
      head.push({
        title: 'Loaded Title',
        meta: [{ name: 'async', content: 'loaded' }],
      })

      // Get the chunk for the resolved await
      const chunk = await renderSSRHeadSuspenseChunk(head)

      expect(chunk).toContain('Loaded Title')
      expect(chunk).toContain('window.__unhead__.push')

      // Close
      const closing = await renderSSRHeadClosing(head)
      const fullHtml = `${shell}<div>Content</div>` + `<script>${chunk}</script>${closing}${htmlEnd}`

      expect(fullHtml).toContain('<!DOCTYPE html>')
      expect(fullHtml).toContain('</html>')
    })

    it('handles multiple await blocks', async () => {
      const head = createStreamableHead()

      head.push({ title: 'Multi-Await Test' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      // First await resolves
      head.push({
        meta: [{ property: 'og:title', content: 'First Await' }],
      })
      const chunk1 = await renderSSRHeadSuspenseChunk(head)
      expect(chunk1).toContain('First Await')

      // Second await resolves
      head.push({
        meta: [{ property: 'og:description', content: 'Second Await' }],
      })
      const chunk2 = await renderSSRHeadSuspenseChunk(head)
      expect(chunk2).toContain('Second Await')

      const closing = await renderSSRHeadClosing(head)
      const fullHtml = `${shell}<script>${chunk1}</script>` + `<script>${chunk2}</script>${closing}${htmlEnd}`

      expect(fullHtml).toContain('First Await')
      expect(fullHtml).toContain('Second Await')
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

    it('handles nested await with head updates', async () => {
      const head = createStreamableHead()

      head.push({ title: 'Nested Await Test', htmlAttrs: { lang: 'en' } })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)
      expect(shell).toContain('<title>Nested Await Test</title>')
      expect(shell).toContain('lang="en"')

      // Outer await resolves
      head.push({
        meta: [{ name: 'outer', content: 'outer-data' }],
      })
      const outerChunk = await renderSSRHeadSuspenseChunk(head)

      // Inner await resolves
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
        `<div>Async Content</div>`,
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

    it('handles head updates without markers', async () => {
      const head = createStreamableHead()

      head.push({ title: 'Update Test' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`

      // First chunk triggers shell
      const chunk1 = '<div>Initial</div>'
      // Second chunk has regular content
      const chunk2 = `<div>Loaded</div><script>/* svelte script */</script>`

      const outputChunks = await collectStream(
        streamWithHead(mockStream([chunk1, chunk2]), template, head),
      )

      // Add update after shell renders
      head.push({ meta: [{ name: 'loaded', content: 'true' }] })

      const fullHtml = outputChunks.join('')

      // Should contain the content
      expect(fullHtml).toContain('/* svelte script */')
      expect(fullHtml).toContain('<div>Loaded</div>')
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

  describe('sync rendering for HeadStream', () => {
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
      const head = createStreamableHead({ streamKey: '__svelte_head__' })

      head.push({ title: 'Custom Key Test' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      expect(shell).toContain('window.__svelte_head__')
      expect(shell).not.toContain('window.__unhead__=')
    })
  })

  describe('svelteKit integration patterns', () => {
    it('handles typical SvelteKit streaming pattern', async () => {
      const head = createStreamableHead()

      // +layout.svelte sets base head
      head.push({
        htmlAttrs: { lang: 'en' },
        meta: [{ charset: 'utf-8' }],
      })

      // +page.svelte sets page-specific head
      head.push({
        title: 'Page Title',
        meta: [{ name: 'description', content: 'Page description' }],
      })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      // Should have both layout and page head
      expect(shell).toContain('lang="en"')
      expect(shell).toContain('charset')
      expect(shell).toContain('Page Title')
      expect(shell).toContain('Page description')

      // Simulate {#await} resolving with data
      head.push({
        title: 'Data Loaded - Page Title',
        meta: [{ property: 'og:title', content: 'Data Loaded' }],
      })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('Data Loaded')

      const closing = await renderSSRHeadClosing(head)
      const fullHtml = `${shell}<script>${chunk}</script>${closing}${htmlEnd}`

      expect(fullHtml).toContain('window.__unhead__')
    })

    it('handles load function data with streaming', async () => {
      const head = createStreamableHead()

      // Initial state from load function
      head.push({ title: 'Loading product...' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)
      expect(shell).toContain('Loading product...')

      // Streamed data arrives
      const productData = {
        name: 'Awesome Product',
        description: 'A really awesome product',
        image: 'https://example.com/product.jpg',
      }

      head.push({
        title: productData.name,
        meta: [
          { name: 'description', content: productData.description },
          { property: 'og:image', content: productData.image },
        ],
      })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('Awesome Product')
      expect(chunk).toContain('A really awesome product')

      const closing = await renderSSRHeadClosing(head)
      const fullHtml = `${shell}<script>${chunk}</script>${closing}${htmlEnd}`

      expect(fullHtml).toContain('og:image')
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
        title: 'Título en español',
        meta: [{ name: 'description', content: '日本語の説明' }],
      })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      expect(shell).toContain('Título en español')
      expect(shell).toContain('日本語の説明')
    })

    it('handles special characters in attributes', async () => {
      const head = createStreamableHead()

      head.push({
        meta: [
          { name: 'description', content: 'Quote: "Hello" & <World>' },
        ],
      })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      // Should properly escape HTML entities
      expect(shell).toContain('description')
      expect(shell).not.toContain('&<World>')
    })
  })
})
