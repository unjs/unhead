// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  createStreamableHead,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
} from '../src/stream/server'

describe('vue streaming SSR integration', () => {
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

    it('streams head updates with suspense chunks', async () => {
      const head = createStreamableHead()

      head.push({ title: 'Loading...' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)
      expect(shell).toContain('<title>Loading...</title>')

      // Simulate async component resolving with new head
      head.push({
        title: 'Loaded Title',
        meta: [{ name: 'async', content: 'loaded' }],
      })

      const chunk = renderSSRHeadSuspenseChunk(head)

      expect(chunk).toContain('Loaded Title')
      expect(chunk).toContain('window.__unhead__.push')

      // Simulate how the full HTML would look
      const fullHtml = `${shell}<div>Content</div><script>${chunk}</script>${htmlEnd}`

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
      const chunk1 = renderSSRHeadSuspenseChunk(head)
      expect(chunk1).toContain('First Component')

      // Second suspense resolves
      head.push({
        meta: [{ property: 'og:description', content: 'Second Component' }],
      })
      const chunk2 = renderSSRHeadSuspenseChunk(head)
      expect(chunk2).toContain('Second Component')

      const fullHtml = `${shell}<script>${chunk1}</script><script>${chunk2}</script>${htmlEnd}`

      expect(fullHtml).toContain('First Component')
      expect(fullHtml).toContain('Second Component')
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
      const outerChunk = renderSSRHeadSuspenseChunk(head)

      // Inner suspense resolves
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
    it('uses custom window key throughout workflow', async () => {
      const head = createStreamableHead({ streamKey: '__vue_head__' })

      head.push({ title: 'Custom Key Test' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      expect(shell).toContain('window.__vue_head__')
      expect(shell).not.toContain('window.__unhead__=')

      // Suspense chunk should also use custom key
      head.push({ title: 'Updated' })
      const chunk = renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('window.__vue_head__.push')
    })
  })

  describe('vue SSR patterns', () => {
    it('handles typical Vue SSR streaming pattern', async () => {
      const head = createStreamableHead()

      // App.vue sets base head
      head.push({
        htmlAttrs: { lang: 'en' },
        meta: [{ charset: 'utf-8' }],
      })

      // Page component sets page-specific head
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

      // Simulate async setup resolving with data
      head.push({
        title: 'Data Loaded - Page Title',
        meta: [{ property: 'og:title', content: 'Data Loaded' }],
      })

      const chunk = renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('Data Loaded')

      const fullHtml = `${shell}<script>${chunk}</script>${htmlEnd}`

      expect(fullHtml).toContain('window.__unhead__')
    })

    it('handles async data fetching pattern', async () => {
      const head = createStreamableHead()

      // Initial state from component setup
      head.push({ title: 'Loading product...' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)
      expect(shell).toContain('Loading product...')

      // Async data arrives (like from useFetch or useAsyncData)
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

  describe('edge cases', () => {
    it('handles empty head gracefully', async () => {
      const head = createStreamableHead()

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      expect(shell).toContain('<head>')
      expect(shell).toContain('window.__unhead__')
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
      // Should properly escape HTML entities
      expect(shell).not.toContain('&<World>')
    })

    it('escapes XSS attempts in shell', async () => {
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
  })

  describe('streaming deduplication', () => {
    it('streams multiple title updates correctly', async () => {
      const head = createStreamableHead()

      head.push({ title: 'First Title' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)
      expect(shell).toContain('<title>First Title</title>')

      // Push updated title
      head.push({ title: 'Second Title' })
      const chunk1 = renderSSRHeadSuspenseChunk(head)
      expect(chunk1).toContain('Second Title')

      // Push another title update
      head.push({ title: 'Third Title' })
      const chunk2 = renderSSRHeadSuspenseChunk(head)
      expect(chunk2).toContain('Third Title')

      const fullHtml = `${shell}<script>${chunk1}</script><script>${chunk2}</script>${htmlEnd}`
      expect(fullHtml).toContain('window.__unhead__.push')
    })

    it('streams link tags added by async components', async () => {
      const head = createStreamableHead()

      head.push({
        link: [{ rel: 'stylesheet', href: '/styles/main.css' }],
      })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)
      expect(shell).toContain('/styles/main.css')

      // Async component adds its own stylesheet
      head.push({
        link: [{ rel: 'stylesheet', href: '/styles/component.css' }],
      })

      const chunk = renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('/styles/component.css')
    })
  })
})
