import {
  createStreamableHead,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
// @vitest-environment node
import { describe, expect, it } from 'vitest'

describe('solid-js streaming SSR e2e', () => {
  describe('full streaming workflow', () => {
    it('streams initial head tags in shell', async () => {
      const { head } = createStreamableHead()

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
      const { head } = createStreamableHead()

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

    it('handles multiple suspense boundaries', async () => {
      const { head } = createStreamableHead()

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

    it('escapes XSS in head content', async () => {
      const { head } = createStreamableHead()

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
      const { head } = createStreamableHead()

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
    it('uses custom window key', async () => {
      const { head } = createStreamableHead({ streamKey: '__solid_head__' })

      head.push({ title: 'Custom Key Test' })

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      expect(shell).toContain('window.__solid_head__')
      expect(shell).not.toContain('window.__unhead__=')
    })
  })

  describe('error handling', () => {
    it('handles empty head gracefully', async () => {
      const { head } = createStreamableHead()

      const template = `<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>`
      const [htmlStart] = template.split('<!--app-html-->')

      const shell = await renderSSRHeadShell(head, htmlStart)

      expect(shell).toContain('<head>')
      expect(shell).toContain('window.__unhead__')
    })

    it('handles unicode content', async () => {
      const { head } = createStreamableHead()

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
