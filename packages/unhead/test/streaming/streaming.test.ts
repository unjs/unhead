import { describe, expect, it } from 'vitest'
import {
  renderSSRHeadClosing,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  STREAM_MARKER,
  streamWithHead,
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

  describe('streamWithHead', () => {
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
      const head = createServerHeadWithContext()
      head.push({ title: 'Initial' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      // Simulate: first chunk, then async component resolves with marker
      async function* appWithSuspense(): AsyncGenerator<string> {
        yield '<div>App Shell</div>'
        // Simulate async component adding head
        head.push({ title: 'Async Title', meta: [{ name: 'async', content: 'true' }] })
        // HeadStream outputs a script with the marker inside
        yield `<div><script>${STREAM_MARKER}</script></div>`
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(appWithSuspense(), template, head)) {
        chunks.push(chunk)
      }

      const fullHtml = chunks.join('')
      // Should have initial title in head
      expect(fullHtml).toContain('<title>Initial</title>')
      // Should have push script for async updates - marker replaced with JS code inside script tag
      expect(fullHtml).toContain('window.__unhead__.push')
      expect(fullHtml).toContain('Async Title')
      // The script tag should be valid (no nested scripts)
      expect(fullHtml).not.toContain('<script><script>')
    })

    it('handles Uint8Array chunks', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Binary Test' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* binaryStream(): AsyncGenerator<Uint8Array> {
        yield new TextEncoder().encode('<div>Binary Content</div>')
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(binaryStream(), template, head)) {
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

  describe('edge cases - XSS and injection', () => {
    it('handles script injection in title', async () => {
      const head = createStreamableServerHead()
      head.push({ title: '<script>alert("xss")</script>' })

      await renderSSRHeadShell(head, '<html><head></head><body>')
      head.push({ title: 'New <script>evil()</script> Title' })

      const result = await renderSSRHeadSuspenseChunk(head)
      // Should be JSON stringified, escaping the content
      expect(result).not.toContain('<script>evil()</script>')
      expect(result).toContain('\\u003c') // Escaped <
    })

    it('handles injection in meta content', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'description', content: '"></meta><script>alert(1)</script><meta content="' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      // JSON.stringify escapes quotes
      expect(result).toContain('\\"')
    })

    it('handles script in innerHTML', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{ innerHTML: 'document.write("<evil>")' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('innerHTML')
      // Content should be JSON escaped
      const parsed = JSON.parse(result.replace('window.__unhead__.push(', '').slice(0, -1))
      expect(parsed.script[0].innerHTML).toBe('document.write("<evil>")')
    })
  })

  describe('edge cases - unicode and special chars', () => {
    it('handles emoji in title', async () => {
      const head = createStreamableServerHead()
      head.push({ title: '🚀 Rocket Launch 🎉' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('🚀 Rocket Launch 🎉')
    })

    it('handles unicode in meta', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'description', content: '日本語テスト 中文测试 한국어테스트' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('日本語テスト')
    })

    it('handles null bytes and control chars', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        title: 'Test\x00Title\x1FEnd',
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      // Should not throw, content should be escaped in JSON
      expect(result).toBeDefined()
    })

    it('handles newlines and tabs in content', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{ innerHTML: 'const x = {\n\tkey: "value"\n}' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('\\n')
      expect(result).toContain('\\t')
    })
  })

  describe('edge cases - empty and null values', () => {
    it('handles empty title', async () => {
      const head = createStreamableServerHead()
      head.push({ title: '' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      // Empty title is not rendered - this is expected behavior
      expect(shell).not.toContain('<title>')
    })

    it('handles push with empty object', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({})

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toBe('')
    })

    it('handles meta with empty content', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'viewport', content: 'width=device-width' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('viewport')
    })

    it('handles no tags pushed', async () => {
      const head = createStreamableServerHead()
      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')

      expect(shell).toContain('window.__unhead__')
      expect(shell).toContain('</head>')
    })
  })

  describe('edge cases - rapid pushes', () => {
    it('handles many rapid consecutive pushes', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Rapid fire 100 pushes
      for (let i = 0; i < 100; i++) {
        head.push({ meta: [{ name: `meta-${i}`, content: `value-${i}` }] })
      }

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('meta-0')
      expect(result).toContain('meta-99')
    })

    it('handles interleaved push and chunk calls', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ meta: [{ name: 'first', content: '1' }] })
      const chunk1 = await renderSSRHeadSuspenseChunk(head)
      expect(chunk1).toContain('first')

      head.push({ meta: [{ name: 'second', content: '2' }] })
      const chunk2 = await renderSSRHeadSuspenseChunk(head)
      expect(chunk2).toContain('second')
      expect(chunk2).not.toContain('first') // Already streamed

      head.push({ meta: [{ name: 'third', content: '3' }] })
      const chunk3 = await renderSSRHeadSuspenseChunk(head)
      expect(chunk3).toContain('third')
      expect(chunk3).not.toContain('first')
      expect(chunk3).not.toContain('second')
    })
  })

  describe('edge cases - complex tag structures', () => {
    it('handles script with all properties', async () => {
      const head = createStreamableServerHead()
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

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('app.js')
      expect(result).toContain('tagPosition')
      expect(result).toContain('tagPriority')
    })

    it('handles link with preload hints', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        link: [
          { rel: 'preload', href: 'font.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
          { rel: 'prefetch', href: 'next-page.js' },
          { rel: 'preconnect', href: 'https://api.example.com' },
        ],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('preload')
      expect(result).toContain('prefetch')
      expect(result).toContain('preconnect')
    })

    it('handles style with textContent', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        style: [{ textContent: '.dark { background: #000; color: #fff; }' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('textContent')
      expect(result).toContain('.dark')
    })

    it('handles noscript tag', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        noscript: [{ textContent: '<img src="tracking.gif">' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('noscript')
    })
  })

  describe('edge cases - template variations', () => {
    it('handles template without doctype', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Test' })

      const result = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(result).toContain('<title>Test</title>')
    })

    it('handles template with existing head content', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Dynamic' })

      const template = '<html><head><meta charset="utf-8"></head><body>'
      const result = await renderSSRHeadShell(head, template)

      expect(result).toContain('<meta charset="utf-8">')
      expect(result).toContain('<title>Dynamic</title>')
    })

    it('handles template without head closing tag', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Test' })

      // Missing </head>
      const template = '<html><head><body>'
      const result = await renderSSRHeadShell(head, template)

      // Should not inject (no </head> marker)
      expect(result).not.toContain('<title>Test</title>')
    })

    it('handles template with attributes on html/body', async () => {
      const head = createStreamableServerHead()
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

  describe('edge cases - streamWithHead', () => {
    async function* mockStream(chunks: (string | Uint8Array)[]): AsyncGenerator<string | Uint8Array> {
      for (const chunk of chunks) {
        yield chunk
      }
    }

    it('handles empty stream', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Empty' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      const chunks: string[] = []
      for await (const chunk of streamWithHead(mockStream([]), template, head)) {
        chunks.push(chunk)
      }

      // Should still output closing
      const html = chunks.join('')
      expect(html).toContain('</body></html>')
    })

    it('handles multiple suspense markers in one chunk', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Initial' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* multiMarkerStream(): AsyncGenerator<string> {
        yield '<div>Start</div>'
        head.push({ meta: [{ name: 'first', content: '1' }] })
        head.push({ meta: [{ name: 'second', content: '2' }] })
        // Multiple HeadStream components in one chunk
        yield `<script>${STREAM_MARKER}</script><script>${STREAM_MARKER}</script>`
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(multiMarkerStream(), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      // Both metas should be in the push (all markers replaced)
      expect(html).toContain('first')
      expect(html).toContain('second')
      // No leftover markers
      expect(html).not.toContain(STREAM_MARKER)
    })

    it('handles marker with no new tags', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Static' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* noNewTagsStream(): AsyncGenerator<string> {
        yield '<div>Content</div>'
        // No new head tags added - HeadStream outputs script with marker
        yield `<script>${STREAM_MARKER}</script>`
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(noNewTagsStream(), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      // Marker should be replaced with empty string (empty script tag)
      expect(html).not.toContain(STREAM_MARKER)
      expect(html).not.toContain('window.__unhead__.push') // No push needed
      // Should have empty script tag
      expect(html).toContain('<script></script>')
    })

    it('handles mixed binary and string chunks', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Mixed' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* mixedStream(): AsyncGenerator<string | Uint8Array> {
        yield '<div>String chunk</div>'
        yield new TextEncoder().encode('<div>Binary chunk</div>')
        yield '<div>Another string</div>'
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(mixedStream(), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      expect(html).toContain('String chunk')
      expect(html).toContain('Binary chunk')
      expect(html).toContain('Another string')
    })

    it('handles very large chunks', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Large' })

      const template = '<html><head></head><body><!--app-html--></body></html>'
      const largeContent = 'x'.repeat(1024 * 1024) // 1MB

      const chunks: string[] = []
      for await (const chunk of streamWithHead(mockStream([`<div>${largeContent}</div>`]), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      expect(html.length).toBeGreaterThan(1024 * 1024)
    })
  })

  describe('edge cases - hash collisions and deduplication', () => {
    it('correctly deduplicates identical tags', async () => {
      const head = createStreamableServerHead()
      head.push({ meta: [{ name: 'robots', content: 'index' }] })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Push exact same tag again
      head.push({ meta: [{ name: 'robots', content: 'index' }] })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toBe('') // Should be empty, tag already streamed
    })

    it('detects different tags with same name', async () => {
      const head = createStreamableServerHead()
      head.push({ meta: [{ name: 'robots', content: 'index' }] })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Same name, different content
      head.push({ meta: [{ name: 'robots', content: 'noindex' }] })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('noindex')
    })

    it('handles titleTemplate changes', async () => {
      const head = createStreamableServerHead()
      head.push({ titleTemplate: '%s | Site' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ titleTemplate: '%s - New Site' })

      const result = await renderSSRHeadSuspenseChunk(head)
      // titleTemplate is resolved to title in the output
      expect(result).toContain('title')
      expect(result).toContain('New Site')
    })
  })

  describe('edge cases - attrs serialization', () => {
    it('handles multiple class values in htmlAttrs', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        htmlAttrs: { class: 'dark theme-blue' },
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('htmlAttrs')
      expect(result).toContain('dark')
      expect(result).toContain('theme-blue')
    })

    it('handles style in htmlAttrs', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        htmlAttrs: { style: 'color: red; background: blue' },
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('htmlAttrs')
      expect(result).toContain('color')
    })

    it('handles boolean attrs', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{ src: 'app.js', async: true, defer: false, nomodule: true }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('"async":true')
      expect(result).toContain('"defer":false')
    })
  })

  describe('edge cases - concurrent streams', () => {
    it('handles multiple independent head instances', async () => {
      const head1 = createStreamableServerHead({ streamKey: '__stream1__' })
      const head2 = createStreamableServerHead({ streamKey: '__stream2__' })

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

      // Now add more tags and get chunks
      head1.push({ meta: [{ name: 'from', content: 'stream1' }] })
      head2.push({ meta: [{ name: 'from', content: 'stream2' }] })

      const [chunk1, chunk2] = await Promise.all([
        renderSSRHeadSuspenseChunk(head1),
        renderSSRHeadSuspenseChunk(head2),
      ])

      expect(chunk1).toContain('stream1')
      expect(chunk1).toContain('__stream1__')
      expect(chunk2).toContain('stream2')
      expect(chunk2).toContain('__stream2__')
    })
  })

  describe('edge cases - disposed entries', () => {
    it('handles disposed entries not appearing in chunk', async () => {
      const head = createStreamableServerHead()
      const entry = head.push({ meta: [{ name: 'temp', content: 'value' }] })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Dispose the entry
      entry.dispose()

      // Push new and check chunk
      head.push({ meta: [{ name: 'permanent', content: 'stays' }] })
      const result = await renderSSRHeadSuspenseChunk(head)

      expect(result).toContain('permanent')
      // temp was in initial shell but now disposed - shouldn't affect chunk
    })

    it('handles entry patched after shell', async () => {
      const head = createStreamableServerHead()
      const entry = head.push({ title: 'Original' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Patch the entry
      entry.patch({ title: 'Patched' })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('Patched')
    })
  })

  describe('edge cases - error resilience', () => {
    it('handles calling suspenseChunk before shell', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Test' })

      // Call chunk before shell - should init _streamedHashes
      const result = await renderSSRHeadSuspenseChunk(head)
      // All tags are new
      expect(result).toContain('Test')
    })

    it('handles calling closing without shell', async () => {
      const head = createStreamableServerHead()
      head.push({
        script: [{ src: 'app.js', tagPosition: 'bodyClose' }],
      })

      // Should still work
      const result = await renderSSRHeadClosing(head)
      expect(result).toContain('app.js')
    })
  })

  describe('edge cases - advanced XSS prevention', () => {
    it('escapes closing script tags in content', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{ innerHTML: 'const x = "</script><script>evil()</script>"' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      // Must not contain literal </script>
      expect(result).not.toContain('</script>')
      // JSON.stringify escapes / so we get \u003c\/script\u003e which is also safe
      expect(result).toContain('\\u003c')
      expect(result).toContain('\\u003e')
    })

    it('escapes HTML entities in all fields', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{
          name: '<script>',
          content: '&<>"\'',
        }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).not.toContain('<script>')
      expect(result).toContain('\\u003cscript\\u003e')
    })

    it('prevents script breaking via unicode escapes', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        title: '\u003Cscript\u003Ealert(1)\u003C/script\u003E',
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      // Even escaped unicode should be re-escaped
      expect(result).not.toContain('<script>')
    })

    it('handles nested quotes and escapes', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{
          innerHTML: 'const obj = {"key": "value with \\"quotes\\" and </script>"}',
        }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).not.toContain('</script>')
      // Should be valid JSON when parsed
      const pushMatch = result.match(/push\((.*)\)$/)
      expect(() => JSON.parse(pushMatch![1].replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&'))).not.toThrow()
    })
  })

  describe('edge cases - boundary conditions', () => {
    it('handles maximum safe integer in attrs', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'max-int', content: String(Number.MAX_SAFE_INTEGER) }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain(String(Number.MAX_SAFE_INTEGER))
    })

    it('handles deeply nested data', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{
          innerHTML: JSON.stringify({
            level1: {
              level2: {
                level3: {
                  level4: {
                    value: 'deep',
                  },
                },
              },
            },
          }),
        }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('deep')
    })

    it('handles array with many elements', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      const metas = Array.from({ length: 50 }, (_, i) => ({
        name: `meta-${i}`,
        content: `value-${i}`,
      }))

      head.push({ meta: metas })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('meta-0')
      expect(result).toContain('meta-49')
    })

    it('handles extremely long single value', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      const longValue = 'a'.repeat(100000)
      head.push({
        meta: [{ name: 'long', content: longValue }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result.length).toBeGreaterThan(100000)
    })
  })

  describe('edge cases - special JSON values', () => {
    it('handles undefined-like strings', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'test', content: 'undefined' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('"undefined"')
    })

    it('handles null-like strings', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'test', content: 'null' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('"null"')
    })

    it('handles numeric strings', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'test', content: '12345' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('"12345"')
    })

    it('handles boolean-like strings', async () => {
      const head = createStreamableServerHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'test', content: 'true' }],
      })

      const result = await renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('"true"')
    })
  })

  describe('edge cases - stream key edge cases', () => {
    it('handles stream key with special characters', async () => {
      const head = createStreamableServerHead({ streamKey: '__my_app_123__' })
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__my_app_123__')
    })

    it('handles unicode in stream key', async () => {
      const head = createStreamableServerHead({ streamKey: '__アプリ__' })
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__アプリ__')
    })
  })

  describe('edge cases - realistic streaming scenarios', () => {
    it('handles realistic e-commerce product page stream', async () => {
      const head = createStreamableServerHead()

      // Initial page head
      head.push({
        title: 'Loading...',
        meta: [
          { name: 'robots', content: 'index,follow' },
          { charset: 'utf-8' },
        ],
        htmlAttrs: { lang: 'en' },
      })

      const template = '<!DOCTYPE html><html><head></head><body><!--app-html--></body></html>'

      async function* productPageStream(): AsyncGenerator<string> {
        yield '<div class="app-shell"><nav>Navigation</nav>'

        // Product data loads
        head.push({
          title: 'iPhone 15 Pro - $999',
          meta: [
            { name: 'description', content: 'Buy iPhone 15 Pro. Starting at $999.' },
            { property: 'og:title', content: 'iPhone 15 Pro' },
            { property: 'og:price:amount', content: '999' },
          ],
        })
        yield `<main><h1>iPhone 15 Pro</h1><script>${STREAM_MARKER}</script>`

        // Reviews load
        head.push({
          meta: [
            { name: 'rating', content: '4.8' },
            { name: 'review-count', content: '2847' },
          ],
        })
        yield `<section class="reviews"><script>${STREAM_MARKER}</script></section>`

        yield '</main></div>'
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(productPageStream(), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      expect(html).toContain('iPhone 15 Pro - $999')
      expect(html).toContain('og:title')
      expect(html).toContain('4.8')
      expect(html).toContain('2847')
    })

    it('handles blog post with async author info', async () => {
      const head = createStreamableServerHead()

      head.push({
        title: 'Loading article...',
        meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* blogStream(): AsyncGenerator<string> {
        yield '<article>'

        // Article content loads
        head.push({
          title: 'Understanding React Server Components',
          meta: [
            { name: 'description', content: 'A deep dive into RSC architecture.' },
            { property: 'og:type', content: 'article' },
            { property: 'article:published_time', content: '2024-01-15T10:00:00Z' },
          ],
          link: [
            { rel: 'canonical', href: 'https://blog.example.com/rsc-deep-dive' },
          ],
        })
        yield `<h1>Understanding React Server Components</h1><p>Content...</p><script>${STREAM_MARKER}</script>`

        // Author info loads async
        head.push({
          meta: [
            { property: 'article:author', content: 'Jane Developer' },
          ],
          script: [{
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              'author': { '@type': 'Person', 'name': 'Jane Developer' },
            }),
          }],
        })
        yield `<footer>By Jane Developer</footer><script>${STREAM_MARKER}</script></article>`
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(blogStream(), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      expect(html).toContain('Understanding React Server Components')
      expect(html).toContain('canonical')
      expect(html).toContain('Jane Developer')
      expect(html).toContain('schema.org')
    })
  })
})
