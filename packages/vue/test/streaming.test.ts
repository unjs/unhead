// @vitest-environment node
import type { SSRHeadPayload } from 'unhead/types'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  createBootstrapScript,
  createStreamableHead,
  renderShell,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
} from '../src/stream/server'

describe('vue streaming SSR', () => {
  describe('createStreamableHead', () => {
    it('uses custom stream key', async () => {
      const { head } = createStreamableHead({ streamKey: '__vue__' })
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__vue__')
    })

    it('uses default stream key', async () => {
      const { head } = createStreamableHead()
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__unhead__')
    })

    it('has install method for Vue app.use()', () => {
      const { head } = createStreamableHead()
      expect(typeof head.install).toBe('function')
    })
  })

  describe('renderSSRHeadShell', () => {
    it('renders initial head tags into shell', async () => {
      const { head } = createStreamableHead()
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
      const { head } = createStreamableHead()
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
      const { head } = createStreamableHead()
      head.push({ title: 'Test' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Entries should be cleared
      const chunk = renderSSRHeadSuspenseChunk(head)
      expect(chunk).toBe('')
    })
  })

  describe('renderSSRHeadSuspenseChunk', () => {
    it('returns empty string when no new tags', async () => {
      const { head } = createStreamableHead()
      head.push({ title: 'Test' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toBe('')
    })

    it('returns push script for new tags', async () => {
      const { head } = createStreamableHead()
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
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: 'First Update' })
      renderSSRHeadSuspenseChunk(head)

      // Second call should return empty
      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toBe('')
    })

    it('uses custom stream key in push call', async () => {
      const { head } = createStreamableHead({ streamKey: '__custom__' })
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: 'Test' })
      const result = renderSSRHeadSuspenseChunk(head)

      expect(result).toContain('window.__custom__.push')
    })
  })

  describe('wrapStream head patches', () => {
    const TEMPLATE = '<html><head></head><body><div id="app"><!--app-html--></div></body></html>'

    // `pull` defers the chunk + head.push until wrapStream is reading, so
    // the entry lands after shell preparation and should surface as an
    // interleaved patch script rather than in the shell.
    it('interleaves self-deleting head-update scripts between app chunks', async () => {
      const { head, wrapStream } = createStreamableHead()
      head.push({ title: 'Initial' })

      const encoder = new TextEncoder()
      let step = 0
      const appStream = new ReadableStream<Uint8Array>({
        pull(c) {
          if (step === 0) {
            c.enqueue(encoder.encode('<div>first</div>'))
            head.push({ title: 'Updated mid-stream' })
          }
          else if (step === 1) {
            c.enqueue(encoder.encode('<div>second</div>'))
          }
          else {
            c.close()
          }
          step++
        },
      })

      const text = await new Response(wrapStream(appStream, TEMPLATE)).text()

      expect(text).toContain('<title>Initial</title>')
      expect(text).toMatch(/<div>first<\/div><script>window\.__unhead__\.push\(.*Updated mid-stream.*\);document\.currentScript\.remove\(\)<\/script><div>second<\/div>/)
    })

    it('escapes script-breakout sequences in streamed head updates', async () => {
      const { head, wrapStream } = createStreamableHead()

      const encoder = new TextEncoder()
      let step = 0
      const appStream = new ReadableStream<Uint8Array>({
        pull(c) {
          if (step === 0) {
            c.enqueue(encoder.encode('<div>app</div>'))
            head.push({ title: '</script><script>alert("xss")</script>' })
          }
          else {
            c.close()
          }
          step++
        },
      })

      const text = await new Response(wrapStream(appStream, TEMPLATE)).text()

      expect(text).not.toContain('</script><script>alert')
      expect(text).toContain('\\u003c')
    })
  })

  describe('xSS prevention', () => {
    it('escapes script tags in title', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        title: '<script>alert("xss")</script>',
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).not.toContain('<script>alert')
      expect(result).toContain('\\u003c')
    })

    it('escapes closing script tags in innerHTML', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{ innerHTML: '</script><script>evil()</script>' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).not.toContain('</script><script>')
    })
  })

  describe('re-exported helpers', () => {
    it('createBootstrapScript returns script with default key', () => {
      const script = createBootstrapScript()
      expect(script).toContain('window.__unhead__')
    })

    it('createBootstrapScript returns script with custom key', () => {
      const script = createBootstrapScript('__vue__')
      expect(script).toContain('window.__vue__')
    })

    it('renderShell renders and clears entries', () => {
      const { head } = createStreamableHead()
      head.push({ title: 'Shell' })

      const result = renderShell(head)
      expect(result.headTags).toContain('<title>Shell</title>')
      expect(head.entries.size).toBe(0)
    })

    it('renderShell returns SSRHeadPayload', () => {
      const { head } = createStreamableHead()
      expectTypeOf(renderShell(head)).toEqualTypeOf<SSRHeadPayload>()
    })
  })

  describe('vue reactivity resolution', () => {
    it('resolves ref-like values', async () => {
      const { head } = createStreamableHead()

      head.push({
        title: { value: 'Ref Title' } as any,
      })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Ref Title')
    })

    it('resolves function values', async () => {
      const { head } = createStreamableHead()

      head.push({
        title: () => 'Computed Title',
      })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Computed Title')
    })
  })

  describe('unicode and special characters', () => {
    it('handles emoji in title', async () => {
      const { head } = createStreamableHead()
      head.push({ title: 'Hello World 🌍' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Hello World 🌍')
    })

    it('handles CJK characters', async () => {
      const { head } = createStreamableHead()
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
