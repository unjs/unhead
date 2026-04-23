import type { SSRHeadPayload } from 'unhead/types'
import {
  createBootstrapScript,
  createStreamableHead,
  prepareStreamingTemplate,
  renderShell,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
import { describe, expect, expectTypeOf, it } from 'vitest'

describe('streaming SSR', () => {
  describe('renderSSRHeadShell', () => {
    it('renders initial head tags into shell', async () => {
      const { head } = createStreamableHead()
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

    it('clears entries after rendering', async () => {
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

      head.push({ title: 'First' })
      renderSSRHeadSuspenseChunk(head)

      // Second call should return empty
      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toBe('')
    })
  })

  describe('custom stream key', () => {
    it('uses custom key in bootstrap script', async () => {
      const { head } = createStreamableHead({ streamKey: '__myhead__' })
      head.push({ title: 'Test' })

      const result = await renderSSRHeadShell(head, '<html><head></head><body>')

      expect(result).toContain('window.__myhead__')
      expect(result).not.toContain('window.__unhead__=')
    })

    it('uses custom key in suspense chunk', async () => {
      const { head } = createStreamableHead({ streamKey: '__custom__' })

      await renderSSRHeadShell(head, '<html><head></head><body>')
      head.push({ title: 'New Title' })

      const result = renderSSRHeadSuspenseChunk(head)

      expect(result).toContain('window.__custom__.push')
    })

    it('supports multiple providers with different keys', async () => {
      const { head: head1 } = createStreamableHead({ streamKey: '__provider1__' })
      const { head: head2 } = createStreamableHead({ streamKey: '__provider2__' })

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
      const { head } = createStreamableHead()
      head.push({ title: 'Test' })

      const result = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(result).toContain('window.__unhead__')
    })

    it('uses custom stream key', async () => {
      const { head } = createStreamableHead({ streamKey: '__custom__' })
      head.push({ title: 'Test' })

      const result = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(result).toContain('window.__custom__')
    })
  })

  describe('xSS prevention', () => {
    it('escapes script injection in title', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: '<script>alert("xss")</script>' })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).not.toContain('<script>alert')
      expect(result).toContain('\\u003c')
    })

    it('escapes closing script tags', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{ innerHTML: '</script><script>evil()</script>' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).not.toContain('</script><script>')
    })

    it('escapes meta content injection', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'description', content: '"></meta><script>alert(1)</script>' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('\\"')
    })

    // GHSA-x7mm-9vvv-64w8: streamKey was interpolated into inline JS without
    // escaping or identifier validation, letting an attacker-controlled key
    // break out of the dot-notation sink and inject arbitrary script.
    describe('streamKey injection (GHSA-x7mm-9vvv-64w8)', () => {
      it('rejects streamKey that breaks out of dot notation', () => {
        expect(() =>
          createStreamableHead({ streamKey: '__unhead__;globalThis.PWNED=1;//' }),
        ).toThrow(/Invalid streamKey/)
      })

      it('rejects streamKey containing closing script tag', () => {
        expect(() =>
          createStreamableHead({ streamKey: '</script><script>alert(1)</script>' }),
        ).toThrow(/Invalid streamKey/)
      })

      it('rejects streamKey with spaces or dots', () => {
        expect(() => createStreamableHead({ streamKey: 'foo bar' })).toThrow(/Invalid streamKey/)
        expect(() => createStreamableHead({ streamKey: 'foo.bar' })).toThrow(/Invalid streamKey/)
      })

      it('rejects empty streamKey', () => {
        expect(() => createStreamableHead({ streamKey: '' })).toThrow(/Invalid streamKey/)
      })

      it('rejects streamKey starting with a digit', () => {
        expect(() => createStreamableHead({ streamKey: '1badKey' })).toThrow(/Invalid streamKey/)
      })

      it('rejects non-string streamKey', () => {
        // @ts-expect-error testing runtime guard against non-string input
        expect(() => createStreamableHead({ streamKey: 123 })).toThrow(/Invalid streamKey/)
      })

      it('accepts valid identifier-shaped keys', () => {
        expect(() => createStreamableHead({ streamKey: '__unhead__' })).not.toThrow()
        expect(() => createStreamableHead({ streamKey: '$foo' })).not.toThrow()
        expect(() => createStreamableHead({ streamKey: '_private123' })).not.toThrow()
      })

      it('rejects injection via createBootstrapScript direct call', () => {
        expect(() => createBootstrapScript('__unhead__;globalThis.PWNED=1;//')).toThrow(
          /Invalid streamKey/,
        )
      })
    })
  })

  describe('unicode and special characters', () => {
    it('handles emoji in title', async () => {
      const { head } = createStreamableHead()
      head.push({ title: '🚀 Rocket Launch 🎉' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('🚀 Rocket Launch 🎉')
    })

    it('handles unicode in meta', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'description', content: '日本語テスト 中文测试 한국어테스트' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('日本語テスト')
    })

    it('handles newlines and tabs in content', async () => {
      const { head } = createStreamableHead()
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
      const { head } = createStreamableHead()
      head.push({ title: '' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).not.toContain('<title>')
    })

    it('handles push with empty object', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({})

      const result = renderSSRHeadSuspenseChunk(head)
      // Empty object still generates a push (client will handle it)
      expect(result).toContain('window.__unhead__.push')
    })

    it('handles no tags pushed', async () => {
      const { head } = createStreamableHead()
      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')

      expect(shell).toContain('window.__unhead__')
      expect(shell).toContain('</head>')
    })
  })

  describe('rapid pushes', () => {
    it('handles many rapid consecutive pushes', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      for (let i = 0; i < 100; i++) {
        head.push({ meta: [{ name: `meta-${i}`, content: `value-${i}` }] })
      }

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('meta-0')
      expect(result).toContain('meta-99')
    })

    it('handles interleaved push and chunk calls', async () => {
      const { head } = createStreamableHead()
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
      const { head } = createStreamableHead()
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
        } as any],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('app.js')
      expect(result).toContain('tagPosition')
    })

    it('handles link with preload hints', async () => {
      const { head } = createStreamableHead()
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
      const { head } = createStreamableHead()
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
      const { head } = createStreamableHead()
      head.push({ title: 'Test' })

      const result = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(result).toContain('<title>Test</title>')
    })

    it('handles template with existing head content', async () => {
      const { head } = createStreamableHead()
      head.push({ title: 'Dynamic' })

      const template = '<html><head><meta charset="utf-8"></head><body>'
      const result = await renderSSRHeadShell(head, template)

      expect(result).toContain('<meta charset="utf-8">')
      expect(result).toContain('<title>Dynamic</title>')
    })

    it('handles template with attributes on html/body', async () => {
      const { head } = createStreamableHead()
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
      const { head: head1 } = createStreamableHead({ streamKey: '__stream1__' })
      const { head: head2 } = createStreamableHead({ streamKey: '__stream2__' })

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
      const { head } = createStreamableHead()
      const entry = head.push({ title: 'Original' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      entry.patch({ title: 'Patched' })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('Patched')
    })
  })

  describe('special JSON values', () => {
    it('handles undefined-like strings', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'test', content: 'undefined' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('"undefined"')
    })

    it('handles null-like strings', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'test', content: 'null' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('"null"')
    })

    it('handles numeric strings', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'test', content: '12345' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('"12345"')
    })

    it('handles boolean-like strings', async () => {
      const { head } = createStreamableHead()
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
      const { head } = createStreamableHead({ streamKey: '__my_app_123__' })
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__my_app_123__')
    })

    it('rejects unicode in stream key', () => {
      // GHSA-x7mm-9vvv-64w8: streamKey is locked to ASCII identifiers to
      // avoid homoglyph and complex Unicode validation edge cases at the
      // inline-JS sink.
      expect(() =>
        createStreamableHead({ streamKey: '__アプリ__' }),
      ).toThrow(/Invalid streamKey/)
    })
  })

  describe('boundary conditions', () => {
    it('handles maximum safe integer in attrs', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'max-int', content: String(Number.MAX_SAFE_INTEGER) }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain(String(Number.MAX_SAFE_INTEGER))
    })

    it('handles array with many elements', async () => {
      const { head } = createStreamableHead()
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
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      const longValue = 'a'.repeat(100000)
      head.push({
        meta: [{ name: 'long', content: longValue }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result.length).toBeGreaterThan(100000)
    })
  })

  describe('createBootstrapScript', () => {
    it('returns script tag with default key', () => {
      const script = createBootstrapScript()
      expect(script).toBe('<script>window.__unhead__={_q:[],push(e){this._q.push(e)}}</script>')
    })

    it('returns script tag with custom key', () => {
      const script = createBootstrapScript('__myapp__')
      expect(script).toContain('window.__myapp__')
      expect(script).not.toContain('window.__unhead__')
    })

    it('returns a string', () => {
      expectTypeOf(createBootstrapScript()).toBeString()
    })
  })

  describe('renderShell', () => {
    it('renders head and clears entries atomically', () => {
      const { head } = createStreamableHead()
      head.push({
        title: 'Shell Test',
        meta: [{ name: 'description', content: 'test' }],
        htmlAttrs: { lang: 'en' },
        bodyAttrs: { class: 'dark' },
      })

      const result = renderShell(head)

      expect(result.headTags).toContain('<title>Shell Test</title>')
      expect(result.headTags).toContain('<meta name="description" content="test">')
      expect(result.htmlAttrs).toContain('lang="en"')
      expect(result.bodyAttrs).toContain('class="dark"')

      // entries should be cleared
      expect(head.entries.size).toBe(0)
      expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    })

    it('returns SSRHeadPayload type', () => {
      const { head } = createStreamableHead()
      const result = renderShell(head)
      expectTypeOf(result).toEqualTypeOf<SSRHeadPayload>()
    })

    it('can be called multiple times', () => {
      const { head } = createStreamableHead()
      head.push({ title: 'First' })

      const first = renderShell(head)
      expect(first.headTags).toContain('First')

      head.push({ title: 'Second' })

      const second = renderShell(head)
      expect(second.headTags).toContain('Second')
      expect(second.headTags).not.toContain('First')
    })

    it('clears entries even with no custom pushes', () => {
      const { head } = createStreamableHead()
      renderShell(head)
      // all default entries should be cleared
      expect(head.entries.size).toBe(0)
    })
  })

  describe('prepareStreamingTemplate', () => {
    it('preserves static content between <body> and </body>', () => {
      const { head } = createStreamableHead()
      head.push({ title: 'Test' })

      // Simulates a Vite plugin (e.g. devtools) injecting a script via
      // transformIndexHtml with injectTo: 'body'.
      const template = '<!DOCTYPE html><html><head></head><body><script type="module">import("/@plugin/bridge.mjs")</script></body></html>'
      const { shell, end } = prepareStreamingTemplate(head, template)

      // Shell ends with the opening <body>, end starts at </body>...
      expect(shell).toContain('<title>Test</title>')
      expect(shell).toContain('window.__unhead__')
      expect(shell).toContain('<body>')
      expect(shell).not.toContain('/@plugin/bridge.mjs')

      // Body interior must survive in the end part so it reaches the client.
      expect(end).toContain('/@plugin/bridge.mjs')
      expect(end).toContain('</body></html>')

      // Round trip: shell + stream + end should still contain the script.
      const fullHtml = `${shell}<div id="app">app</div>${end}`
      expect(fullHtml).toContain('/@plugin/bridge.mjs')
    })

    it('preserves multiple body-injected tags in their original order', () => {
      const { head } = createStreamableHead()

      const template = '<html><head></head><body><script>a()</script><script>b()</script><script>c()</script></body></html>'
      const { end } = prepareStreamingTemplate(head, template)

      const aIdx = end.indexOf('a()')
      const bIdx = end.indexOf('b()')
      const cIdx = end.indexOf('c()')
      expect(aIdx).toBeGreaterThanOrEqual(0)
      expect(bIdx).toBeGreaterThan(aIdx)
      expect(cIdx).toBeGreaterThan(bIdx)
    })

    it('handles empty body without losing closing tags', () => {
      const { head } = createStreamableHead()
      head.push({ title: 'Empty Body' })

      const template = '<html><head></head><body></body></html>'
      const { shell, end } = prepareStreamingTemplate(head, template)

      expect(shell).toContain('<title>Empty Body</title>')
      expect(shell).toContain('<body>')
      expect(end).toBe('</body></html>')
    })

    it('splits at <!--app-html--> marker so streamed content lands inside the container', () => {
      const { head } = createStreamableHead()

      const template = '<html><head></head><body><div id="app"><!--app-html--></div></body></html>'
      const { shell, end } = prepareStreamingTemplate(head, template)

      // Shell ends inside the container; streamed content lands as its
      // first child. Container closing tag plus </body></html> live in end.
      expect(shell.endsWith('<div id="app">')).toBe(true)
      expect(end).toBe('</div></body></html>')
    })

    it('also recognises Vite\'s <!--ssr-outlet--> marker', () => {
      const { head } = createStreamableHead()

      const template = '<html><head></head><body><div id="root"><!--ssr-outlet--></div></body></html>'
      const { shell, end } = prepareStreamingTemplate(head, template)

      expect(shell.endsWith('<div id="root">')).toBe(true)
      expect(end).toBe('</div></body></html>')
    })

    it('preserves siblings around the marker', () => {
      const { head } = createStreamableHead()
      head.push({ script: [{ src: 'user.js', tagPosition: 'bodyClose' }] })

      const template = '<html><head></head><body><header>before</header><div id="app"><!--app-html--></div><footer>after</footer></body></html>'
      const { shell, end } = prepareStreamingTemplate(head, template)

      expect(shell).toContain('<header>before</header><div id="app">')
      // After-marker content + bodyTags + closing tags, in order.
      expect(end.indexOf('</div>')).toBeLessThan(end.indexOf('<footer>after</footer>'))
      expect(end.indexOf('<footer>after</footer>')).toBeLessThan(end.indexOf('user.js'))
      expect(end.indexOf('user.js')).toBeLessThan(end.indexOf('</body>'))
    })

    it('places head bodyTags after preserved body content', () => {
      const { head } = createStreamableHead()
      head.push({
        script: [{ src: 'user-tag.js', tagPosition: 'bodyClose' }],
      })

      const template = '<html><head></head><body><script>plugin()</script></body></html>'
      const { end } = prepareStreamingTemplate(head, template)

      const pluginIdx = end.indexOf('plugin()')
      const userIdx = end.indexOf('user-tag.js')
      const closeIdx = end.indexOf('</body>')

      // Plugin-injected script first (matching original template order),
      // then unhead body tags, then </body>.
      expect(pluginIdx).toBeGreaterThanOrEqual(0)
      expect(userIdx).toBeGreaterThan(pluginIdx)
      expect(closeIdx).toBeGreaterThan(userIdx)
    })
  })
})
