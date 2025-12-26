// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  createStreamableHead,
  HeadStream,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
} from '../src/stream/server'

describe('vue streaming SSR', () => {
  describe('createStreamableHead', () => {
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

    it('clears entries after rendering shell', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Test' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Entries should be cleared
      const chunk = renderSSRHeadSuspenseChunk(head)
      expect(chunk).toBe('')
    })
  })

  describe('renderSSRHeadSuspenseChunk', () => {
    it('returns empty string when no new tags', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Test' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      const result = renderSSRHeadSuspenseChunk(head)
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

      const result = renderSSRHeadSuspenseChunk(head)

      expect(result).toContain('window.__unhead__.push')
      expect(result).toContain('Updated Title')
      expect(result).toContain('New description')
    })

    it('clears entries after rendering chunk', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: 'First Update' })
      renderSSRHeadSuspenseChunk(head)

      // Second call should return empty
      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toBe('')
    })

    it('uses custom stream key in push call', async () => {
      const head = createStreamableHead({ streamKey: '__custom__' })
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: 'Test' })
      const result = renderSSRHeadSuspenseChunk(head)

      expect(result).toContain('window.__custom__.push')
    })
  })

  describe('headStream component', () => {
    it('renders script tag with head updates via Vue SSR', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: 'Streamed Title' })

      // Create a minimal app that provides head and renders HeadStream
      const App = defineComponent({
        setup() {
          return () => h(HeadStream)
        },
      })

      const app = createSSRApp(App)
      app.provide('usehead', head)

      const html = await renderToString(app)

      expect(html).toContain('<script>')
      expect(html).toContain('window.__unhead__.push')
      expect(html).toContain('Streamed Title')
      expect(html).toContain('</script>')
    })

    it('renders null when no updates', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      // No new entries pushed

      const App = defineComponent({
        setup() {
          return () => h(HeadStream)
        },
      })

      const app = createSSRApp(App)
      app.provide('usehead', head)

      const html = await renderToString(app)

      expect(html).toBe('<!---->') // Vue SSR comment for null render
    })

    it('properly escapes script content to prevent XSS', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: '</script><script>alert("xss")</script>' })

      const App = defineComponent({
        setup() {
          return () => h(HeadStream)
        },
      })

      const app = createSSRApp(App)
      app.provide('usehead', head)

      const html = await renderToString(app)

      // Should not contain unescaped closing script tag
      expect(html).not.toContain('</script><script>')
      expect(html).toContain('\\u003c') // Escaped <
    })
  })

  describe('xSS prevention', () => {
    it('escapes script tags in title', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        title: '<script>alert("xss")</script>',
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).not.toContain('<script>alert')
      expect(result).toContain('\\u003c')
    })

    it('escapes closing script tags in innerHTML', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{ innerHTML: '</script><script>evil()</script>' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).not.toContain('</script><script>')
    })
  })

  describe('vue reactivity resolution', () => {
    it('resolves ref-like values', async () => {
      const head = createStreamableHead()

      head.push({
        title: { value: 'Ref Title' } as any,
      })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Ref Title')
    })

    it('resolves function values', async () => {
      const head = createStreamableHead()

      head.push({
        title: () => 'Computed Title',
      })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Computed Title')
    })
  })

  describe('unicode and special characters', () => {
    it('handles emoji in title', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Hello World 🌍' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Hello World 🌍')
    })

    it('handles CJK characters', async () => {
      const head = createStreamableHead()
      head.push({
        title: '你好世界',
        meta: [{ name: 'description', content: 'こんにちは' }],
      })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('你好世界')
      expect(shell).toContain('こんにちは')
    })
  })
})
