import { renderSSRHeadShell, renderSSRHeadSuspenseChunk, STREAM_MARKER, streamWithHead } from 'unhead'
import { describe, expect, it } from 'vitest'
import { createStreamableServerHead } from '../util'

describe('streaming SSR - nested Suspense boundaries', () => {
  describe('basic nested Suspense', () => {
    it('handles single level nesting with sequential resolution', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Root' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* nestedSuspenseStream(): AsyncGenerator<string> {
        yield '<div class="root">'

        // Outer Suspense resolves
        head.push({ title: 'Outer Component', meta: [{ name: 'level', content: 'outer' }] })
        yield `<div class="outer"><script>${STREAM_MARKER}</script>`

        // Inner Suspense resolves
        head.push({ title: 'Inner Component', meta: [{ name: 'level', content: 'inner' }] })
        yield `<div class="inner"><script>${STREAM_MARKER}</script></div>`

        yield '</div></div>'
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(nestedSuspenseStream(), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      // Final title should be "Inner Component"
      expect(html).toContain('Inner Component')
      // Both levels should have their meta tags streamed
      expect(html).toContain('"level"')
      expect(html).toContain('outer')
      expect(html).toContain('inner')
    })

    it('handles deeply nested Suspense (3 levels)', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'App' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* deeplyNestedStream(): AsyncGenerator<string> {
        yield '<div class="app">'

        // Level 1
        head.push({ title: 'Level 1', meta: [{ name: 'depth', content: '1' }] })
        yield `<div class="level-1"><script>${STREAM_MARKER}</script>`

        // Level 2
        head.push({ title: 'Level 2', meta: [{ name: 'depth', content: '2' }] })
        yield `<div class="level-2"><script>${STREAM_MARKER}</script>`

        // Level 3
        head.push({ title: 'Level 3', meta: [{ name: 'depth', content: '3' }] })
        yield `<div class="level-3"><script>${STREAM_MARKER}</script></div>`

        yield '</div></div></div>'
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(deeplyNestedStream(), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      expect(html).toContain('Level 3')
      expect(html).toContain('"depth"')
      // All depths should be present
      expect(html).toMatch(/"content":"1"/)
      expect(html).toMatch(/"content":"2"/)
      expect(html).toMatch(/"content":"3"/)
    })

    it('handles sibling Suspense within nested Suspense', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Container' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* siblingNestedStream(): AsyncGenerator<string> {
        yield '<div class="container">'

        // Parent Suspense
        head.push({ meta: [{ name: 'section', content: 'parent' }] })
        yield `<div class="parent"><script>${STREAM_MARKER}</script>`

        // First sibling
        head.push({ title: 'Sibling A', meta: [{ name: 'sibling', content: 'a' }] })
        yield `<div class="sibling-a"><script>${STREAM_MARKER}</script></div>`

        // Second sibling
        head.push({ title: 'Sibling B', meta: [{ name: 'sibling', content: 'b' }] })
        yield `<div class="sibling-b"><script>${STREAM_MARKER}</script></div>`

        yield '</div></div>'
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(siblingNestedStream(), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      // Last sibling's title wins
      expect(html).toContain('Sibling B')
      // Both siblings' meta should be present
      expect(html).toContain('"sibling"')
      expect(html).toMatch(/"content":"a"/)
      expect(html).toMatch(/"content":"b"/)
    })
  })

  describe('nested Suspense deduplication', () => {
    it('deduplicates same tags across nested boundaries', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Initial', meta: [{ name: 'robots', content: 'index' }] })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* dedupStream(): AsyncGenerator<string> {
        yield '<div>'

        // Outer pushes same robots meta
        head.push({ meta: [{ name: 'robots', content: 'index' }] })
        yield `<div class="outer"><script>${STREAM_MARKER}</script>`

        // Inner pushes same robots meta
        head.push({ meta: [{ name: 'robots', content: 'index' }] })
        yield `<div class="inner"><script>${STREAM_MARKER}</script></div>`

        yield '</div></div>'
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(dedupStream(), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      // Should only have one push call (duplicates deduped)
      const pushMatches = html.match(/window\.__unhead__\.push/g)
      // Initial is in head, no new pushes needed if all same
      expect(pushMatches).toBeFalsy()
    })

    it('streams only unique tags from nested boundaries', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Initial' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // First boundary adds meta A
      head.push({ meta: [{ name: 'meta-a', content: 'a' }] })
      const chunk1 = await renderSSRHeadSuspenseChunk(head)

      // Second boundary adds meta B (new) and meta A (dupe)
      head.push({ meta: [{ name: 'meta-a', content: 'a' }, { name: 'meta-b', content: 'b' }] })
      const chunk2 = await renderSSRHeadSuspenseChunk(head)

      expect(chunk1).toContain('meta-a')
      expect(chunk2).toContain('meta-b')
      // chunk2 should not contain meta-a again (already streamed)
      expect(chunk2).not.toContain('meta-a')
    })
  })

  describe('nested Suspense with keys', () => {
    it('deduplicates links with same key across nested boundaries', async () => {
      const head = createStreamableServerHead()
      head.push({
        link: [{ key: 'font', rel: 'stylesheet', href: 'font-v1.css' }],
      })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Outer boundary updates font
      head.push({
        link: [{ key: 'font', rel: 'stylesheet', href: 'font-v2.css' }],
      })
      const chunk1 = await renderSSRHeadSuspenseChunk(head)

      // Inner boundary updates font again
      head.push({
        link: [{ key: 'font', rel: 'stylesheet', href: 'font-v3.css' }],
      })
      const chunk2 = await renderSSRHeadSuspenseChunk(head)

      expect(chunk1).toContain('font-v2.css')
      expect(chunk2).toContain('font-v3.css')
    })
  })

  describe('nested Suspense with htmlAttrs/bodyAttrs', () => {
    it('merges htmlAttrs across nested boundaries', async () => {
      const head = createStreamableServerHead()
      head.push({ htmlAttrs: { lang: 'en' } })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* attrsStream(): AsyncGenerator<string> {
        yield '<div>'

        // Outer adds class
        head.push({ htmlAttrs: { class: 'dark' } })
        yield `<div class="outer"><script>${STREAM_MARKER}</script>`

        // Inner adds data attr
        head.push({ htmlAttrs: { 'data-page': 'nested' } })
        yield `<div class="inner"><script>${STREAM_MARKER}</script></div>`

        yield '</div></div>'
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(attrsStream(), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      expect(html).toContain('lang="en"')
      expect(html).toContain('dark')
      expect(html).toContain('data-page')
    })

    it('handles bodyAttrs updates from nested boundaries', async () => {
      const head = createStreamableServerHead()
      head.push({ bodyAttrs: { class: 'loading' } })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Outer updates body class
      head.push({ bodyAttrs: { class: 'loaded' } })
      const chunk1 = await renderSSRHeadSuspenseChunk(head)

      // Inner adds style
      head.push({ bodyAttrs: { style: 'overflow: hidden' } })
      const chunk2 = await renderSSRHeadSuspenseChunk(head)

      expect(chunk1).toContain('loaded')
      expect(chunk2).toContain('overflow')
    })
  })

  describe('nested Suspense interleaving', () => {
    it('handles interleaved push and marker across nesting levels', async () => {
      const head = createStreamableServerHead()
      // Initial push before stream starts
      head.push({ title: 'Initial' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* interleavedStream(): AsyncGenerator<string> {
        yield '<div class="app">'

        // Multiple pushes before marker
        head.push({ title: 'First' })
        head.push({ meta: [{ name: 'm1', content: '1' }] })
        yield `<div class="first"><script>${STREAM_MARKER}</script>`

        // Single push
        head.push({ meta: [{ name: 'm2', content: '2' }] })
        yield `<div class="second"><script>${STREAM_MARKER}</script>`

        // Push, then nested structure
        head.push({ title: 'Inner' })
        yield `<div class="inner"><script>${STREAM_MARKER}</script></div>`

        yield '</div></div></div>'
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(interleavedStream(), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      expect(html).toContain('Inner')
      expect(html).toContain('m1')
      expect(html).toContain('m2')
      // No leftover markers
      expect(html).not.toContain(STREAM_MARKER)
    })
  })
})

describe('streaming SSR - error handling', () => {
  describe('stream errors', () => {
    it('handles stream that throws mid-way', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Before Error' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* errorStream(): AsyncGenerator<string> {
        yield '<div>Content before error</div>'
        head.push({ title: 'About to error' })
        yield `<script>${STREAM_MARKER}</script>`
        throw new Error('Stream error!')
      }

      const chunks: string[] = []
      await expect(async () => {
        for await (const chunk of streamWithHead(errorStream(), template, head)) {
          chunks.push(chunk)
        }
      }).rejects.toThrow('Stream error!')

      // Chunks before error should be captured
      const html = chunks.join('')
      expect(html).toContain('Content before error')
    })

    it('head state is preserved after stream error', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Initial' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({ title: 'Updated', meta: [{ name: 'test', content: 'value' }] })

      // Simulate what happens after a stream error - head should still be usable
      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('Updated')
      expect(chunk).toContain('test')
    })
  })

  describe('invalid input handling', () => {
    it('handles undefined chunk gracefully', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Test' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* undefinedChunkStream(): AsyncGenerator<string | undefined> {
        yield '<div>Start</div>'
        yield undefined as any
        yield '<div>End</div>'
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(undefinedChunkStream() as any, template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      expect(html).toContain('Start')
      expect(html).toContain('End')
    })

    it('handles empty string chunk', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Test' })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* emptyChunkStream(): AsyncGenerator<string> {
        yield '<div>Before</div>'
        yield ''
        yield '<div>After</div>'
      }

      const chunks: string[] = []
      for await (const chunk of streamWithHead(emptyChunkStream(), template, head)) {
        chunks.push(chunk)
      }

      const html = chunks.join('')
      expect(html).toContain('Before')
      expect(html).toContain('After')
    })
  })

  describe('recovery scenarios', () => {
    it('continues streaming after push with invalid data', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Valid' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Push with problematic but valid data
      head.push({ meta: [{ name: '', content: '' }] })
      await renderSSRHeadSuspenseChunk(head)

      // Continue with valid data
      head.push({ title: 'Still Working' })
      const chunk2 = await renderSSRHeadSuspenseChunk(head)

      expect(chunk2).toContain('Still Working')
    })

    it('handles rapid dispose and push during streaming', async () => {
      const head = createStreamableServerHead()
      const entry = head.push({ title: 'Temporary' })

      await renderSSRHeadShell(head, '<html><head></head><body>')

      // Rapid dispose and push
      entry.dispose()
      head.push({ title: 'Replacement' })

      const chunk = await renderSSRHeadSuspenseChunk(head)
      expect(chunk).toContain('Replacement')
    })
  })
})
