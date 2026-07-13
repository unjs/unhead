import {
  createStreamableHead,
  prepareStreamingTemplate,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  wrapStream,
} from 'unhead/stream/server'
import { describe, expect, it, vi } from 'vitest'

const TEMPLATE = '<!DOCTYPE html><html><head></head><body><div id="app"><!--app-html--></div></body></html>'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  let i = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length)
        controller.enqueue(encoder.encode(chunks[i++]))
      else
        controller.close()
    },
  })
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  let out = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break
    out += decoder.decode(value, { stream: true })
  }
  return out
}

function makeHead() {
  const { head } = createStreamableHead()
  head.push({ title: 'Stream Test', meta: [{ name: 'description', content: 'lifecycle' }] })
  return head
}

describe('wrapStream lifecycle', () => {
  it('happy path: output is shell + upstream chunks + end, byte-identical', async () => {
    const expected = prepareStreamingTemplate(makeHead(), TEMPLATE)
    const chunks = ['<h1>Hello</h1>', '<p>World</p>']

    const out = await readAll(wrapStream(makeHead(), streamFrom(chunks), TEMPLATE))

    expect(out).toBe(expected.shell + chunks.join('') + expected.end)
  })

  it('respects backpressure: upstream is not drained when downstream does not read', async () => {
    let pulls = 0
    const upstream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls++
        if (pulls > 100)
          controller.close()
        else
          controller.enqueue(encoder.encode(`chunk-${pulls}`))
      },
    })

    const wrapped = wrapStream(makeHead(), upstream, TEMPLATE)
    const reader = wrapped.getReader()
    // Read only the shell, then stop reading entirely.
    await reader.read()
    // Give any eager draining a chance to run.
    await new Promise(resolve => setTimeout(resolve, 20))

    // Only prebuffered pulls (internal queues) may have happened; the
    // upstream must not have been fully drained.
    expect(pulls).toBeLessThan(5)
    reader.releaseLock()
  })

  it('cancelling the wrapped stream cancels upstream exactly once with the reason', async () => {
    const cancelSpy = vi.fn()
    const upstream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(encoder.encode('x'))
      },
      cancel: cancelSpy,
    })

    const wrapped = wrapStream(makeHead(), upstream, TEMPLATE)
    const reader = wrapped.getReader()
    await reader.read() // shell
    await reader.cancel('user-abort')

    expect(cancelSpy).toHaveBeenCalledTimes(1)
    expect(cancelSpy).toHaveBeenCalledWith('user-abort')
  })

  it('upstream error propagates and the closing suffix is never emitted', async () => {
    const boom = new Error('upstream failed')
    let pulls = 0
    const upstream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls++
        if (pulls === 1)
          controller.enqueue(encoder.encode('<h1>partial</h1>'))
        else
          controller.error(boom)
      },
    })

    const wrapped = wrapStream(makeHead(), upstream, TEMPLATE)
    const reader = wrapped.getReader()
    let out = ''
    await expect((async () => {
      while (true) {
        const { done, value } = await reader.read()
        if (done)
          break
        out += decoder.decode(value, { stream: true })
      }
    })()).rejects.toThrow(boom)

    expect(out).toContain('<h1>partial</h1>')
    expect(out).not.toContain('</body>')
    expect(out).not.toContain('</html>')
  })

  it('template failure errors the stream and retains entries', async () => {
    const head = makeHead()
    const sizeBefore = head.entries.size
    const wrapped = wrapStream(head, streamFrom(['x']), null as any)
    await expect(readAll(wrapped)).rejects.toThrow()
    expect(head.entries.size).toBe(sizeBefore)
  })
})

describe('entry retention on failure', () => {
  it('renderSSRHeadSuspenseChunk: cyclic input throws, entries retained, retry succeeds', async () => {
    const { head } = createStreamableHead()
    head.push({ title: 'Shell' })
    renderSSRHeadShell(head, '<html><head></head><body>')

    const cyclic: any = { title: 'Bad' }
    cyclic.self = cyclic
    const badEntry = head.push(cyclic)

    expect(() => renderSSRHeadSuspenseChunk(head)).toThrow()
    // Entries must survive the failed serialization for retry.
    expect(head.entries.size).toBe(1)

    // Remove the bad entry and retry.
    badEntry.dispose()
    head.push({ title: 'Good' })
    const result = renderSSRHeadSuspenseChunk(head)
    expect(result).toContain('Good')
    expect(head.entries.size).toBe(0)
  })

  it('renderSSRHeadShell: template failure throws and retains entries', () => {
    const { head } = createStreamableHead()
    head.push({ title: 'Keep Me' })
    const sizeBefore = head.entries.size

    expect(() => renderSSRHeadShell(head, null as any)).toThrow()
    expect(head.entries.size).toBe(sizeBefore)

    // Retry with a valid template succeeds.
    const result = renderSSRHeadShell(head, '<html><head></head><body>')
    expect(result).toContain('<title>Keep Me</title>')
    expect(head.entries.size).toBe(0)
  })

  it('prepareStreamingTemplate: template failure throws and retains entries', () => {
    const { head } = createStreamableHead()
    head.push({ title: 'Keep Me' })
    const sizeBefore = head.entries.size

    expect(() => prepareStreamingTemplate(head, null as any)).toThrow()
    expect(head.entries.size).toBe(sizeBefore)

    // Retry with a valid template succeeds.
    const { shell } = prepareStreamingTemplate(head, TEMPLATE)
    expect(shell).toContain('<title>Keep Me</title>')
    expect(head.entries.size).toBe(0)
  })
})
