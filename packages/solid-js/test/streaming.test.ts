// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  createStreamableHead,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
} from '../src/stream/server'

const STREAM_TEMPLATE = '<html><head></head><body><!--app-html--></body></html>'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function decodeChunk(chunk: Uint8Array | undefined): string {
  return chunk ? decoder.decode(chunk) : ''
}

function withTimeout<T>(promise: Promise<T>, message: string, ms = 1000): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout)
      clearTimeout(timeout)
  })
}

describe('solid-js streaming SSR', () => {
  describe('createStreamableHead', () => {
    it('uses custom stream key', async () => {
      const { head } = createStreamableHead({ streamKey: '__solid__' })
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__solid__')
    })

    it('uses default stream key', async () => {
      const { head } = createStreamableHead()
      head.push({ title: 'Test' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('window.__unhead__')
    })
  })

  describe('wrapStream', () => {
    it('rejects when the inner stream errors before shell is ready', async () => {
      const { wrapStream } = createStreamableHead()
      const error = new Error('pre-shell stream failure')
      const appStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.error(error)
        },
      })

      const reader = wrapStream(appStream, STREAM_TEMPLATE).getReader()

      await expect(withTimeout(reader.read(), 'pre-shell stream error did not reject')).rejects.toBe(error)
      expect(appStream.locked).toBe(false)
    })

    it('rejects when the inner stream errors after shell is ready', async () => {
      const { head, onCompleteShell, wrapStream } = createStreamableHead()
      const error = new Error('post-shell stream failure')
      let appController!: ReadableStreamDefaultController<Uint8Array>
      const appStream = new ReadableStream<Uint8Array>({
        start(controller) {
          appController = controller
        },
      })

      head.push({ title: 'Shell Ready' })
      const reader = wrapStream(appStream, STREAM_TEMPLATE).getReader()
      onCompleteShell()

      const shellChunk = await withTimeout(reader.read(), 'shell chunk was not emitted')
      expect(shellChunk.done).toBe(false)
      expect(decodeChunk(shellChunk.value)).toContain('<title>Shell Ready</title>')

      appController.enqueue(encoder.encode('<main>app</main>'))
      const appChunk = await withTimeout(reader.read(), 'app chunk was not emitted')
      expect(appChunk.done).toBe(false)
      expect(decodeChunk(appChunk.value)).toBe('<main>app</main>')

      appController.error(error)
      await expect(withTimeout(reader.read(), 'post-shell stream error did not reject')).rejects.toBe(error)
      expect(appStream.locked).toBe(false)
    })

    it('cancels the inner reader when the outer reader is cancelled', async () => {
      const { wrapStream } = createStreamableHead()
      const reason = new Error('client aborted')
      let cancelReason: unknown
      let cancelCount = 0
      const appStream = new ReadableStream<Uint8Array>({
        pull() {
          return Promise.resolve()
        },
        cancel(cancelledReason) {
          cancelCount++
          cancelReason = cancelledReason
        },
      })

      const reader = wrapStream(appStream, STREAM_TEMPLATE).getReader()

      await withTimeout(reader.cancel(reason), 'outer stream cancel did not resolve')
      expect(cancelCount).toBe(1)
      expect(cancelReason).toBe(reason)
      expect(appStream.locked).toBe(false)
    })

    it('flushes buffered chunks and releases the inner reader after normal completion', async () => {
      const { head, onCompleteShell, wrapStream } = createStreamableHead()
      const appStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('<main>buffered app</main>'))
          controller.close()
        },
      })

      head.push({ title: 'Buffered Shell' })
      const textPromise = new Response(wrapStream(appStream, STREAM_TEMPLATE)).text()

      await Promise.resolve()
      onCompleteShell()

      const text = await withTimeout(textPromise, 'normal stream completion did not resolve')
      expect(text).toContain('<title>Buffered Shell</title>')
      expect(text).toContain('<main>buffered app</main>')
      expect(text).toContain('</html>')
      expect(appStream.locked).toBe(false)
    })
  })

  describe('renderSSRHeadShell', () => {
    it('renders initial head tags into shell', async () => {
      const { head } = createStreamableHead()
      head.push({
        title: 'Solid Streaming Test',
        meta: [{ name: 'description', content: 'Test description' }],
      })

      const template = '<!DOCTYPE html><html><head></head><body>'
      const result = await renderSSRHeadShell(head, template)

      expect(result).toContain('<title>Solid Streaming Test</title>')
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

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toBe('')
    })
  })

  describe('xSS prevention', () => {
    it('escapes script tags in content', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        title: '<script>alert("xss")</script>',
      })

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
  })

  describe('multiple providers', () => {
    it('supports different stream keys', async () => {
      const { head: head1 } = createStreamableHead({ streamKey: '__solid1__' })
      const { head: head2 } = createStreamableHead({ streamKey: '__solid2__' })

      head1.push({ title: 'Provider 1' })
      head2.push({ title: 'Provider 2' })

      const shell1 = await renderSSRHeadShell(head1, '<html><head></head><body>')
      const shell2 = await renderSSRHeadShell(head2, '<html><head></head><body>')

      expect(shell1).toContain('window.__solid1__')
      expect(shell1).toContain('Provider 1')
      expect(shell2).toContain('window.__solid2__')
      expect(shell2).toContain('Provider 2')
    })
  })

  describe('unicode and special characters', () => {
    it('handles emoji in title', async () => {
      const { head } = createStreamableHead()
      head.push({ title: 'Solid App 🚀' })

      const shell = await renderSSRHeadShell(head, '<html><head></head><body>')
      expect(shell).toContain('Solid App 🚀')
    })

    it('handles unicode in meta', async () => {
      const { head } = createStreamableHead()
      await renderSSRHeadShell(head, '<html><head></head><body>')

      head.push({
        meta: [{ name: 'description', content: '日本語テスト' }],
      })

      const result = renderSSRHeadSuspenseChunk(head)
      expect(result).toContain('日本語テスト')
    })
  })
})
