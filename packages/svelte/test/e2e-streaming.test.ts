import {
  createStreamableHead,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
// @vitest-environment node
import { describe, expect, it } from 'vitest'

describe('svelte streaming SSR e2e', () => {
  describe('full streaming workflow', () => {
    it('streams initial head tags in shell', async () => {
      const head = createStreamableHead()

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

      head.push({ title: 'Loading...' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)
      expect(shell).toContain('<title>Loading...</title>')

      head.push({
        title: 'Loaded Title',
        meta: [{ name: 'async', content: 'loaded' }],
      })

      const chunk = renderSSRHeadSuspenseChunk(head)

      expect(chunk).toContain('Loaded Title')
      expect(chunk).toContain('window.__unhead__.push')

      const fullHtml = `${shell}<div>Content</div><script>${chunk}</script>${htmlEnd}`

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
      const chunk1 = renderSSRHeadSuspenseChunk(head)
      expect(chunk1).toContain('First Await')

      // Second await resolves
      head.push({
        meta: [{ property: 'og:description', content: 'Second Await' }],
      })
      const chunk2 = renderSSRHeadSuspenseChunk(head)
      expect(chunk2).toContain('Second Await')

      const fullHtml = `${shell}<script>${chunk1}</script><script>${chunk2}</script>${htmlEnd}`

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
      const outerChunk = renderSSRHeadSuspenseChunk(head)

      // Inner await resolves
      head.push({
        meta: [{ name: 'inner', content: 'inner-data' }],
      })
      const innerChunk = renderSSRHeadSuspenseChunk(head)

      const fullHtml = `${shell}<script>${outerChunk}</script><script>${innerChunk}</script>${htmlEnd}`

      expect(fullHtml).toContain('outer-data')
      expect(fullHtml).toContain('inner-data')
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

      expect(shell).toContain('lang="en"')
      expect(shell).toContain('charset')
      expect(shell).toContain('Page Title')
      expect(shell).toContain('Page description')

      // Simulate {#await} resolving with data
      head.push({
        title: 'Data Loaded - Page Title',
        meta: [{ property: 'og:title', content: 'Data Loaded' }],
      })

      const chunk = renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('Data Loaded')

      const fullHtml = `${shell}<script>${chunk}</script>${htmlEnd}`

      expect(fullHtml).toContain('window.__unhead__')
    })

    it('handles load function data with streaming', async () => {
      const head = createStreamableHead()

      head.push({ title: 'Loading product...' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)
      expect(shell).toContain('Loading product...')

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

      const chunk = renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('Awesome Product')
      expect(chunk).toContain('A really awesome product')

      const fullHtml = `${shell}<script>${chunk}</script>${htmlEnd}`

      expect(fullHtml).toContain('og:image')
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

      expect(shell).toContain('description')
      expect(shell).not.toContain('&<World>')
    })
  })
})
