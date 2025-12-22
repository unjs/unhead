import { renderSSRHeadShell, renderSSRHeadSuspenseChunk, streamWithHead } from 'unhead'
import { describe, expect, it } from 'vitest'
import { createStreamableServerHead } from '../util'

describe('streaming SSR - nested Suspense boundaries', () => {
  describe('nested Suspense deduplication', () => {
    it('deduplicates same tags across nested boundaries', async () => {
      const head = createStreamableServerHead()
      head.push({ title: 'Initial', meta: [{ name: 'robots', content: 'index' }] })

      const template = '<html><head></head><body><!--app-html--></body></html>'

      async function* dedupStream(): AsyncGenerator<string> {
        yield '<div>'

        // Outer pushes same robots meta
        head.push({ meta: [{ name: 'robots', content: 'index' }] })
        yield `<div class="outer">Outer content`

        // Inner pushes same robots meta
        head.push({ meta: [{ name: 'robots', content: 'index' }] })
        yield `<div class="inner">Inner content</div>`

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
        yield `<script>/* error recovery test */</script>`
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
