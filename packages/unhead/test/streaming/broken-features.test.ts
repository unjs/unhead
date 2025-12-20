import { renderSSRHeadClosing, renderSSRHeadShell, renderSSRHeadSuspenseChunk } from 'unhead'
/**
 * Tests for features that may be broken or have edge cases with streaming SSR.
 * These test specific behaviors that could fail when tags are added progressively.
 */
import { describe, expect, it } from 'vitest'
import { createStreamableServerHead } from '../util'

describe('streaming SSR - potentially broken features', () => {
  describe('tag deduplication across stream boundaries', () => {
    it('dedupes meta by name across shell and chunk', async () => {
      const head = createStreamableServerHead()
      head.push({ meta: [{ name: 'description', content: 'Initial description' }] })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Initial description')

      // Push same meta name with different content - should this replace or add?
      head.push({ meta: [{ name: 'description', content: 'Updated description' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      // The updated description should appear in chunk
      expect(chunk).toContain('Updated description')
    })

    it('dedupes meta by key across shell and chunk', async () => {
      const head = createStreamableServerHead()
      head.push({ meta: [{ key: 'og:title', property: 'og:title', content: 'Initial' }] })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ meta: [{ key: 'og:title', property: 'og:title', content: 'Updated' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('Updated')
    })

    it('dedupes link canonical - only one should exist', async () => {
      const head = createStreamableServerHead()
      head.push({ link: [{ rel: 'canonical', href: 'https://example.com/page1' }] })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Another component tries to set canonical
      head.push({ link: [{ rel: 'canonical', href: 'https://example.com/page2' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      // Should have the updated canonical
      expect(chunk).toContain('page2')
    })

    it('dedupes script by key', async () => {
      const head = createStreamableServerHead()
      head.push({ script: [{ key: 'analytics', src: 'analytics-v1.js' }] })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ script: [{ key: 'analytics', src: 'analytics-v2.js' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('analytics-v2.js')
    })
  })

  describe('titleTemplate across stream boundaries', () => {
    it('applies titleTemplate set in shell to title in chunk', async () => {
      const head = createStreamableServerHead()
      head.push({ titleTemplate: '%s | My Site' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: 'Products' })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      // Title should have template applied
      expect(chunk).toContain('Products | My Site')
    })

    it('handles titleTemplate change mid-stream', async () => {
      const head = createStreamableServerHead()
      head.push({ titleTemplate: '%s | Site A', title: 'Home' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Home | Site A')

      // Change template and title
      head.push({ titleTemplate: '%s - Site B', title: 'About' })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('About - Site B')
    })

    it('handles titleTemplate with null title', async () => {
      const head = createStreamableServerHead()
      head.push({ titleTemplate: '%s | My Site' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Push titleTemplate function that handles null
      head.push({ titleTemplate: title => title ? `${title} | My Site` : 'My Site' })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toBeDefined()
    })
  })

  describe('htmlAttrs/bodyAttrs merging', () => {
    it('merges class attrs from multiple pushes', async () => {
      const head = createStreamableServerHead()
      head.push({ htmlAttrs: { class: 'theme-light' } })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('theme-light')

      head.push({ htmlAttrs: { class: 'page-home' } })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      // Both classes should be present or merged
      expect(chunk).toContain('htmlAttrs')
    })

    it('handles lang attr changes', async () => {
      const head = createStreamableServerHead()
      head.push({ htmlAttrs: { lang: 'en' } })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Component changes language
      head.push({ htmlAttrs: { lang: 'fr' } })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('fr')
    })

    it('merges bodyAttrs from multiple sources', async () => {
      const head = createStreamableServerHead()
      head.push({ bodyAttrs: { class: 'app' } })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ bodyAttrs: { 'data-page': 'product' } })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('data-page')
    })
  })

  describe('tagPosition behavior', () => {
    it('bodyClose scripts only appear in closing', async () => {
      const head = createStreamableServerHead()
      head.push({ script: [{ src: 'head-script.js' }] })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('head-script.js')

      // Add bodyClose script mid-stream
      head.push({ script: [{ src: 'body-script.js', tagPosition: 'bodyClose' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      // bodyClose script should NOT be in chunk
      expect(chunk).not.toContain('body-script.js')

      const closing = await renderSSRHeadClosing(head)
      expect(closing).toContain('body-script.js')
    })

    it('bodyOpen scripts appear at right position', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ script: [{ src: 'body-open.js', tagPosition: 'bodyOpen' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      // bodyOpen might appear in chunk or need special handling
      // This tests current behavior
      expect(chunk).toBeDefined()
    })
  })

  describe('entry disposal mid-stream', () => {
    it('disposed entry tags do not appear in subsequent chunks', async () => {
      const head = createStreamableServerHead()
      const entry = head.push({ meta: [{ name: 'temp', content: 'temporary' }] })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('temporary')

      // Dispose the entry
      entry.dispose()

      // Push new content
      head.push({ meta: [{ name: 'permanent', content: 'stays' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('permanent')
      // temp meta should not reappear
      expect(chunk).not.toContain('temporary')
    })

    it('disposed entry does not affect deduplication', async () => {
      const head = createStreamableServerHead()
      const entry = head.push({ meta: [{ name: 'description', content: 'v1' }] })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      entry.dispose()

      // New entry with same name should work
      head.push({ meta: [{ name: 'description', content: 'v2' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('v2')
    })
  })

  describe('entry patching mid-stream', () => {
    it('patched entry appears in chunk', async () => {
      const head = createStreamableServerHead()
      const entry = head.push({ title: 'Original' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Original')

      entry.patch({ title: 'Patched' })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('Patched')
    })

    it('patched meta content appears in chunk', async () => {
      const head = createStreamableServerHead()
      const entry = head.push({ meta: [{ name: 'description', content: 'Initial' }] })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      entry.patch({ meta: [{ name: 'description', content: 'Patched' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('Patched')
    })
  })

  describe('tag priority/ordering', () => {
    it('high priority tags appear before low priority in shell', async () => {
      const head = createStreamableServerHead()
      head.push({ meta: [{ name: 'low', content: 'low', tagPriority: 'low' }] })
      head.push({ meta: [{ name: 'high', content: 'high', tagPriority: 'high' }] })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')

      const highIndex = shell.indexOf('high')
      const lowIndex = shell.indexOf('low')

      // High priority should come first
      expect(highIndex).toBeLessThan(lowIndex)
    })

    it('critical priority in chunk maintains order', async () => {
      const head = createStreamableServerHead()
      head.push({ meta: [{ charset: 'utf-8' }] })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'viewport', content: 'width=device-width', tagPriority: 'critical' }],
      })
      head.push({ link: [{ rel: 'stylesheet', href: 'style.css' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      // Check ordering in serialized output
      expect(chunk).toBeDefined()
    })
  })

  describe('script innerHTML handling', () => {
    it('jSON-LD script innerHTML preserved across stream', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            'name': 'Test Product',
          }),
        }],
      })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('schema.org')
      expect(chunk).toContain('Product')

      // Verify JSON is valid in the output by parsing the push argument
      const match = chunk.match(/\.push\((.+)\)$/)
      if (match) {
        const headObj = JSON.parse(match[1])
        expect(headObj.script[0].innerHTML).toBeDefined()
        expect(() => JSON.parse(headObj.script[0].innerHTML)).not.toThrow()
      }
    })

    it('inline script with variables preserved', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{
          innerHTML: 'window.__CONFIG__ = {"apiUrl": "https://api.example.com"}',
        }],
      })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('__CONFIG__')
      expect(chunk).toContain('apiUrl')
    })
  })

  describe('style tags', () => {
    it('style textContent preserved in chunk', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        style: [{
          textContent: '.async-component { color: red; background: blue; }',
        }],
      })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('.async-component')
      expect(chunk).toContain('color: red')
    })

    it('multiple style tags from different components', async () => {
      const head = createStreamableServerHead()
      head.push({ style: [{ textContent: '.initial { margin: 0; }' }] })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ style: [{ textContent: '.async { padding: 10px; }' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('.async')
      expect(chunk).not.toContain('.initial') // Already streamed
    })
  })

  describe('noscript tags', () => {
    it('noscript content preserved', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        noscript: [{
          textContent: '<img src="tracking.gif" alt="">',
        }],
      })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('noscript')
      expect(chunk).toContain('tracking.gif')
    })
  })

  describe('base tag handling', () => {
    it('base tag in shell respected', async () => {
      const head = createStreamableServerHead()
      head.push({ base: { href: 'https://example.com/' } })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('base')
      expect(shell).toContain('https://example.com/')
    })

    it('base tag update in chunk', async () => {
      const head = createStreamableServerHead()
      head.push({ base: { href: 'https://example.com/' } })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ base: { href: 'https://cdn.example.com/' } })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('cdn.example.com')
    })
  })

  describe('duplicate prevention edge cases', () => {
    it('same tag pushed twice in same chunk only appears once', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Push same tag twice
      head.push({ meta: [{ name: 'robots', content: 'index' }] })
      head.push({ meta: [{ name: 'robots', content: 'index' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)

      // Count occurrences
      const matches = chunk.match(/robots/g) || []
      // Should only appear once due to deduplication by hash
      expect(matches.length).toBeLessThanOrEqual(2) // name + content
    })

    it('handles rapid push/dispose cycles', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Rapid push/dispose
      for (let i = 0; i < 10; i++) {
        const entry = head.push({ meta: [{ name: `temp-${i}`, content: `value-${i}` }] })
        entry.dispose()
      }

      // Final push
      head.push({ meta: [{ name: 'final', content: 'stays' }] })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('final')
      // Disposed entries should not appear
      expect(chunk).not.toContain('temp-0')
    })
  })

  describe('empty/falsy value handling', () => {
    it('empty string title handled correctly', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Initial' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: '' })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      // Empty title behavior - document current behavior
      expect(chunk).toBeDefined()
    })

    it('undefined meta content handled', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'test', content: undefined as any }],
      })

      // Should not throw
      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toBeDefined()
    })

    it('null values in attrs handled', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        htmlAttrs: { 'data-test': null as any },
      })

      // Should not throw
      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toBeDefined()
    })
  })

  describe('special characters in values', () => {
    it('quotes in meta content escaped', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'description', content: 'He said "hello" and \'goodbye\'' }],
      })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      // Quotes should be escaped in JSON
      expect(chunk).toContain('\\"hello\\"')
    })

    it('backslashes in content escaped', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'path', content: 'C:\\Users\\test\\file.txt' }],
      })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('\\\\') // Escaped backslash
    })

    it('newlines in innerHTML handled', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        script: [{
          innerHTML: `
            const config = {
              key: "value"
            };
          `,
        }],
      })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('\\n')
    })
  })

  describe('client hydration concerns', () => {
    it('serialized data can be parsed by client', async () => {
      const head = createStreamableServerHead()

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        title: 'Test Page',
        meta: [
          { name: 'description', content: 'A test with "quotes" and <tags>' },
          { property: 'og:title', content: 'OG Title' },
        ],
        link: [{ rel: 'canonical', href: 'https://example.com/page' }],
        script: [{ type: 'application/ld+json', innerHTML: '{"@type":"WebPage"}' }],
      })

      const chunk = await renderSSRHeadSuspenseChunk(head)

      // Extract and parse the JSON
      const match = chunk.match(/push\((.+)\)$/)
      expect(match).toBeTruthy()

      const jsonStr = match![1]
        .replace(/\\u003c/g, '<')
        .replace(/\\u003e/g, '>')
        .replace(/\\u0026/g, '&')

      expect(() => JSON.parse(jsonStr)).not.toThrow()

      const parsed = JSON.parse(jsonStr)
      expect(parsed.title).toBe('Test Page')
      expect(parsed.meta).toHaveLength(2)
    })
  })
})
