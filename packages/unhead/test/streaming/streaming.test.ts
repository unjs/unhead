import { describe, expect, it } from 'vitest'
import { renderSSRStreamComponents, streamAppWithUnhead } from '../../src/server'
import { createServerHeadWithContext } from '../util'

describe('streaming SSR', () => {
  describe('renderSSRStreamComponents', () => {
    it('processes initial template chunk with head tags', async () => {
      const head = createServerHeadWithContext()
      head.push({
        title: 'Test Page',
        meta: [{ name: 'description', content: 'Test description' }],
      })

      const html = '<html><head></head><body>'
      const result = await renderSSRStreamComponents(head, html)

      expect(result).toContain('<title>Test Page</title>')
      expect(result).toContain('<meta name="description" content="Test description">')
      expect(result).toContain('__unheadNormalizeAttrs')
    })

    it('injects empty title tag if none provided', async () => {
      const head = createServerHeadWithContext()
      head.push({
        meta: [{ name: 'viewport', content: 'width=device-width' }],
      })

      const html = '<html><head></head><body>'
      const result = await renderSSRStreamComponents(head, html)

      expect(result).toContain('<title></title>')
    })

    it('applies html and body attrs', async () => {
      const head = createServerHeadWithContext()
      head.push({
        htmlAttrs: { lang: 'en', dir: 'ltr' },
        bodyAttrs: { class: 'dark' },
      })

      const html = '<html><head></head><body>'
      const result = await renderSSRStreamComponents(head, html)

      expect(result).toContain('lang="en"')
      expect(result).toContain('dir="ltr"')
      expect(result).toContain('class="dark"')
    })

    it('processes app chunk with stream marker', async () => {
      const head = createServerHeadWithContext()
      head._rootStreamedTags = {}

      head.push({
        title: 'Updated Title',
        style: ['.new-style { color: red; }'],
      })

      const html = '<div data-unhead-stream><!--[unhead-stream]--></div>'
      const result = await renderSSRStreamComponents(head, html)

      expect(result).toContain('document.title = "Updated Title"')
      expect(result).toContain('.new-style { color: red; }')
    })

    it('handles key-based deduplication correctly', async () => {
      const head = createServerHeadWithContext()
      head._rootStreamedTags = {
        'link:key:preload': { tag: 'link', props: { key: 'preload', rel: 'stylesheet', href: 'old.css', 'data-hid': 'preload' }, _d: 'link:key:preload' },
      }

      head.push({
        link: [{ key: 'preload', rel: 'stylesheet', href: 'new.css' }],
      })

      const html = '<div data-unhead-stream><!--[unhead-stream]--></div>'
      const result = await renderSSRStreamComponents(head, html)

      expect(result).toContain('querySelector(\'[data-hid="preload"]\')')
      expect(result).toContain('remove()')
    })

    it('escapes special characters in data-hid for selector', async () => {
      const head = createServerHeadWithContext()
      head._rootStreamedTags = {
        'link:key:my"key': { tag: 'link', props: { key: 'my"key', rel: 'stylesheet', href: 'old.css', 'data-hid': 'my"key' }, _d: 'link:key:my"key' },
      }

      head.push({
        link: [{ key: 'my"key', rel: 'stylesheet', href: 'new.css' }],
      })

      const html = '<div data-unhead-stream><!--[unhead-stream]--></div>'
      const result = await renderSSRStreamComponents(head, html)

      // Should escape the quote
      expect(result).toContain('[data-hid="my\\"key"]')
    })

    it('handles backslash in data-hid', async () => {
      const head = createServerHeadWithContext()
      head._rootStreamedTags = {
        'link:key:my\\key': { tag: 'link', props: { key: 'my\\key', rel: 'stylesheet', href: 'old.css', 'data-hid': 'my\\key' }, _d: 'link:key:my\\key' },
      }

      head.push({
        link: [{ key: 'my\\key', rel: 'stylesheet', href: 'new.css' }],
      })

      const html = '<div data-unhead-stream><!--[unhead-stream]--></div>'
      const result = await renderSSRStreamComponents(head, html)

      // Should escape the backslash
      expect(result).toContain('[data-hid="my\\\\key"]')
    })

    it('handles body position tags correctly', async () => {
      const head = createServerHeadWithContext()
      head._rootStreamedTags = {}

      head.push({
        script: [{ src: 'test.js', tagPosition: 'bodyClose' }],
      })

      const html = '<div data-unhead-stream><!--[unhead-stream]--></div>'
      const result = await renderSSRStreamComponents(head, html)

      expect(result).toContain("document.body.insertAdjacentHTML('beforeend'")
    })

    it('updates bodyAttrs with style during streaming', async () => {
      const head = createServerHeadWithContext()
      head._rootStreamedTags = {}

      head.push({
        bodyAttrs: {
          style: { 'background-color': 'red' },
        },
      })

      const html = '<div data-unhead-stream><!--[unhead-stream]--></div>'
      const result = await renderSSRStreamComponents(head, html)

      expect(result).toContain('__unheadNormalizeAttrs(document.body')
      expect(result).toContain('background-color')
    })
  })

  describe('streamAppWithUnhead', () => {
    async function* mockAppStream(chunks: string[]): AsyncGenerator<string> {
      for (const chunk of chunks) {
        yield chunk
      }
    }

    it('streams basic app with head injection', async () => {
      const head = createServerHeadWithContext()
      head.push({
        title: 'Streamed Page',
        meta: [{ name: 'description', content: 'A streamed page' }],
      })

      const htmlStart = '<!DOCTYPE html><html><head></head><body>'
      const htmlEnd = '</body></html>'
      const appChunks = ['<div>Hello</div>', '<div>World</div>']

      const chunks: string[] = []
      for await (const chunk of streamAppWithUnhead(mockAppStream(appChunks), htmlStart, htmlEnd, head)) {
        chunks.push(chunk)
      }

      const fullHtml = chunks.join('')
      expect(fullHtml).toContain('<title>Streamed Page</title>')
      expect(fullHtml).toContain('<div>Hello</div>')
      expect(fullHtml).toContain('<div>World</div>')
      expect(fullHtml).toContain('</body></html>')
    })

    it('processes chunks with stream markers', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Initial' })

      const htmlStart = '<!DOCTYPE html><html><head></head><body>'
      const htmlEnd = '</body></html>'
      const appChunks = [
        '<div>First</div>',
        '<script data-unhead-stream><!--[unhead-stream]--></script>',
      ]

      const chunks: string[] = []
      for await (const chunk of streamAppWithUnhead(mockAppStream(appChunks), htmlStart, htmlEnd, head)) {
        chunks.push(chunk)
      }

      // First chunk should have initial head
      expect(chunks[0]).toContain('<title>Initial</title>')
      // Later chunk should have the stream marker processed
      expect(chunks.some(c => c.includes('(function()'))).toBe(true)
    })

    it('handles Uint8Array chunks', async () => {
      const head = createServerHeadWithContext()
      head.push({ title: 'Binary Test' })

      const htmlStart = '<html><head></head><body>'
      const htmlEnd = '</body></html>'

      async function* binaryStream(): AsyncGenerator<Uint8Array> {
        yield new TextEncoder().encode('<div>Binary Content</div>')
      }

      const chunks: string[] = []
      for await (const chunk of streamAppWithUnhead(binaryStream(), htmlStart, htmlEnd, head)) {
        chunks.push(chunk)
      }

      const fullHtml = chunks.join('')
      expect(fullHtml).toContain('<title>Binary Test</title>')
      expect(fullHtml).toContain('<div>Binary Content</div>')
    })

    it('appends body tags at the end', async () => {
      const head = createServerHeadWithContext()
      head.push({
        script: [{ src: 'analytics.js', tagPosition: 'bodyClose' }],
      })

      const htmlStart = '<html><head></head><body>'
      const htmlEnd = '</body></html>'

      const chunks: string[] = []
      for await (const chunk of streamAppWithUnhead(mockAppStream(['<div>App</div>']), htmlStart, htmlEnd, head)) {
        chunks.push(chunk)
      }

      const lastChunk = chunks[chunks.length - 1]
      expect(lastChunk).toContain('<script src="analytics.js"></script>')
      expect(lastChunk).toContain('</body>')
    })

    it('passes through non-marker chunks unchanged', async () => {
      const head = createServerHeadWithContext()

      const htmlStart = '<html><head></head><body>'
      const htmlEnd = '</body></html>'
      const appChunks = ['<div>First</div>', '<div>Second</div>', '<div>Third</div>']

      const chunks: string[] = []
      for await (const chunk of streamAppWithUnhead(mockAppStream(appChunks), htmlStart, htmlEnd, head)) {
        chunks.push(chunk)
      }

      // Non-first, non-marker chunks should pass through as-is
      expect(chunks[1]).toBe('<div>Second</div>')
      expect(chunks[2]).toBe('<div>Third</div>')
    })
  })
})
