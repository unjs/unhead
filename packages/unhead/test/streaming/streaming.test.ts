import {
  createStreamableHead,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

describe('streaming SSR', () => {
  describe('renderSSRHeadShell', () => {
    it('renders initial head tags into shell', async () => {
      const head = createStreamableHead()
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

    it('clears entries after rendering', async () => {
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

      head.push({ title: 'First' })
      renderSSRHeadSuspenseChunk(head)

      // Second call should return empty
      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toBe('')
    })
  })

  describe('custom stream key', () => {
    it('uses custom key in bootstrap script', async () => {
      const head = createStreamableHead({ streamKey: '__myhead__' })
      head.push({ title: 'Test' })

      const result = await renderSSRHeadShell(head, '<html><head></head><body>')

      expect(result).toContain('window.__myhead__')
      expect(result).not.toContain('window.__unhead__=')
    })

    it('uses custom key in suspense chunk', async () => {
      const head = createStreamableHead({ streamKey: '__custom__' })

      await renderSSRHeadShell(head, '<html><head></head><body>')
      head.push({ title: 'New Title' })

      const result = renderSSRHeadSuspenseChunk(head)

      expect(result).toContain('window.__custom__.push')
    })

    it('supports multiple providers with different keys', async () => {
      const head1 = createStreamableHead({ streamKey: '__provider1__' })
      const head2 = createStreamableHead({ streamKey: '__provider2__' })

      head1.push({ title: 'Provider 1' })
      head2.push({ title: 'Provider 2' })

      const shell1 = await renderSSRHeadShell(head1, '<html><head></head><body>')
      const shell2 = await renderSSRHeadShell(head2, '<html><head></head><body>')

      expect(shell1).toContain('window.__provider1__')
      expect(shell2).toContain('window.__provider2__')
    })
  })

  describe('createStreamableHead', () => {
    it('uses default stream key', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Test' })

      const result = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(result).toContain('window.__unhead__')
    })

    it('uses custom stream key', async () => {
      const head = createStreamableHead({ streamKey: '__custom__' })
      head.push({ title: 'Test' })

      const result = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(result).toContain('window.__custom__')
    })
  })

  describe('xSS prevention', () => {
    it('escapes script injection in title', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: '<script>alert("xss")</script>' })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).not.toContain('<script>alert')
      expect(result).toContain('\\u003c')
    })

    it('escapes closing script tags', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{ innerHTML: '</script><script>evil()</script>' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).not.toContain('</script><script>')
    })

    it('escapes meta content injection', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'description', content: '"></meta><script>alert(1)</script>' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('\\"')
    })
  })

  describe('unicode and special characters', () => {
    it('handles emoji in title', async () => {
      const head = createStreamableHead()
      head.push({ title: '🚀 Rocket Launch 🎉' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('🚀 Rocket Launch 🎉')
    })

    it('handles unicode in meta', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'description', content: '日本語テスト 中文测试 한국어테스트' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('日本語テスト')
    })

    it('handles newlines and tabs in content', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{ innerHTML: 'const x = {\n\tkey: "value"\n}' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('\\n')
      expect(result).toContain('\\t')
    })
  })

  describe('empty and edge values', () => {
    it('handles empty title', async () => {
      const head = createStreamableHead()
      head.push({ title: '' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).not.toContain('<title>')
    })

    it('handles push with empty object', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({})

      const result = renderSSRHeadSuspenseChunk(head)
      // Empty object still generates a push (client will handle it)
      expect(result).toContain('window.__unhead__.push')
    })

    it('handles no tags pushed', async () => {
      const head = createStreamableHead()
      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')

      expect(shell).toContain('window.__unhead__')
      expect(shell).toContain('</head>')
    })
  })

  describe('rapid pushes', () => {
    it('handles many rapid consecutive pushes', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      for (let i = 0; i < 100; i++) {
        head.push({ meta: [{ name: `meta-${i}`, content: `value-${i}` }] })
      }

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('meta-0')
      expect(result).toContain('meta-99')
    })

    it('handles interleaved push and chunk calls', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ meta: [{ name: 'first', content: '1' }] })
      const chunk1 = renderSSRHeadSuspenseChunk(head)
      expect(chunk1).toContain('first')

      head.push({ meta: [{ name: 'second', content: '2' }] })
      const chunk2 = renderSSRHeadSuspenseChunk(head)
      expect(chunk2).toContain('second')
      expect(chunk2).not.toContain('first')

      head.push({ meta: [{ name: 'third', content: '3' }] })
      const chunk3 = renderSSRHeadSuspenseChunk(head)
      expect(chunk3).toContain('third')
      expect(chunk3).not.toContain('first')
      expect(chunk3).not.toContain('second')
    })
  })

  describe('complex tag structures', () => {
    it('handles script with all properties', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{
          src: 'app.js',
          async: true,
          defer: true,
          type: 'module',
          crossorigin: 'anonymous',
          innerHTML: 'console.log("test")',
          tagPosition: 'head',
          tagPriority: 'high',
        }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('app.js')
      expect(result).toContain('tagPosition')
    })

    it('handles link with preload hints', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        link: [
          { rel: 'preload', href: 'font.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
          { rel: 'prefetch', href: 'next-page.js' },
          { rel: 'preconnect', href: 'https://api.example.com' },
        ],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('preload')
      expect(result).toContain('prefetch')
      expect(result).toContain('preconnect')
    })

    it('handles style with textContent', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        style: [{ textContent: '.dark { background: #000; color: #fff; }' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('textContent')
      expect(result).toContain('.dark')
    })
  })

  describe('template variations', () => {
    it('handles template without doctype', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Test' })

      const result = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(result).toContain('<title>Test</title>')
    })

    it('handles template with existing head content', async () => {
      const head = createStreamableHead()
      head.push({ title: 'Dynamic' })

      const template = '<html><head><meta charset="utf-8"></head><body>'
      const result = await renderSSRHeadShell(head, template)

      expect(result).toContain('<meta charset="utf-8">')
      expect(result).toContain('<title>Dynamic</title>')
    })

    it('handles template with attributes on html/body', async () => {
      const head = createStreamableHead()
      head.push({
        htmlAttrs: { 'data-theme': 'dark' },
        bodyAttrs: { 'data-page': 'home' },
      })

      const template = '<html class="existing"><head></head><body class="loaded">'
      const result = await renderSSRHeadShell(head, template)

      expect(result).toContain('data-theme="dark"')
      expect(result).toContain('data-page="home"')
    })
  })

  describe('concurrent streams', () => {
    it('handles multiple independent head instances', async () => {
      const head1 = createStreamableHead({ streamKey: '__stream1__' })
      const head2 = createStreamableHead({ streamKey: '__stream2__' })

      head1.push({ title: 'Stream 1' })
      head2.push({ title: 'Stream 2' })

      const [shell1, shell2] = await Promise.all([
        renderSSRHeadShell(head1, '<html><head></head><body>'),
        renderSSRHeadShell(head2, '<html><head></head><body>'),
      ])

      expect(shell1).toContain('Stream 1')
      expect(shell1).toContain('__stream1__')
      expect(shell2).toContain('Stream 2')
      expect(shell2).toContain('__stream2__')

      head1.push({ meta: [{ name: 'from', content: 'stream1' }] })
      head2.push({ meta: [{ name: 'from', content: 'stream2' }] })

      const chunk1 = renderSSRHeadSuspenseChunk(head1)
      const chunk2 = renderSSRHeadSuspenseChunk(head2)

      expect(chunk1).toContain('stream1')
      expect(chunk1).toContain('__stream1__')
      expect(chunk2).toContain('stream2')
      expect(chunk2).toContain('__stream2__')
    })
  })

  describe('disposed entries', () => {
    it('handles entry patched after shell', async () => {
      const head = createStreamableHead()
      const entry = head.push({ title: 'Original' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      entry.patch({ title: 'Patched' })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('Patched')
    })
  })

  describe('special JSON values', () => {
    it('handles undefined-like strings', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'test', content: 'undefined' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('"undefined"')
    })

    it('handles null-like strings', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'test', content: 'null' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('"null"')
    })

    it('handles numeric strings', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'test', content: '12345' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('"12345"')
    })

    it('handles boolean-like strings', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'test', content: 'true' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('"true"')
    })
  })

  describe('stream key edge cases', () => {
    it('handles stream key with special characters', async () => {
      const head = createStreamableHead({ streamKey: '__my_app_123__' })
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__my_app_123__')
    })

    it('handles unicode in stream key', async () => {
      const head = createStreamableHead({ streamKey: '__アプリ__' })
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__アプリ__')
    })
  })

  describe('boundary conditions', () => {
    it('handles maximum safe integer in attrs', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'max-int', content: String(Number.MAX_SAFE_INTEGER) }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain(String(Number.MAX_SAFE_INTEGER))
    })

    it('handles array with many elements', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      const metas = Array.from({ length: 50 }, (_, i) => ({
        name: `meta-${i}`,
        content: `value-${i}`,
      }))

      head.push({ meta: metas })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('meta-0')
      expect(result).toContain('meta-49')
    })

    it('handles extremely long single value', async () => {
      const head = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      const longValue = 'a'.repeat(100000)
      head.push({
        meta: [{ name: 'long', content: longValue }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result.length).toBeGreaterThan(100000)
    })
  })
})
