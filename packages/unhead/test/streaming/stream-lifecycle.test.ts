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

  it('swallows a rejecting upstream cancel and releases the lock', async () => {
    const upstream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(encoder.encode('x'))
      },
      cancel() {
        return Promise.reject(new Error('cancel failed'))
      },
    })

    const wrapped = wrapStream(makeHead(), upstream, TEMPLATE)
    const reader = wrapped.getReader()
    await reader.read() // shell
    // A cancelling consumer has walked away; the upstream rejection must not
    // surface (fire-and-forget cancel() would otherwise crash the process
    // with an unhandled rejection) and the lock must still be released.
    await expect(reader.cancel('user-abort')).resolves.toBeUndefined()

    expect(upstream.locked).toBe(false)
  })

  it('cancelling as the upstream errors mid-read resolves without an unhandled rejection', async () => {
    const boom = new Error('upstream boom')
    let upstreamController!: ReadableStreamDefaultController<Uint8Array>
    const upstream = new ReadableStream<Uint8Array>({
      start(controller) {
        upstreamController = controller
      },
      // Never resolves: keeps the wrapped stream's pull() awaiting read().
      pull: () => new Promise<void>(() => {}),
    })

    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)
    try {
      const wrapped = wrapStream(makeHead(), upstream, TEMPLATE)
      const reader = wrapped.getReader()
      await reader.read() // shell
      const inFlight = reader.read() // pull() awaits upstream
      upstreamController.error(boom)
      // cancel() lands before pull's rejection continuation: it hits the
      // already-errored upstream, whose reader.cancel() rejects with `boom`.
      // That rejection must be swallowed, not surfaced to the canceller.
      await expect(reader.cancel('client-disconnect')).resolves.toBeUndefined()
      await expect(inFlight).resolves.toEqual({ done: true, value: undefined })

      await new Promise(resolve => setTimeout(resolve, 20))
      expect(unhandled).toEqual([])
    }
    finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })

  it('returns an errored stream (no sync throw) when the upstream is already locked, entries retained', async () => {
    const head = makeHead()
    const sizeBefore = head.entries.size
    const upstream = streamFrom(['x'])
    upstream.getReader() // lock it before wrapping

    const wrapped = wrapStream(head, upstream, TEMPLATE)
    await expect(readAll(wrapped)).rejects.toThrow()
    expect(head.entries.size).toBe(sizeBefore)
  })

  it('cancelling while a pull is in flight is safe and cancels upstream once', async () => {
    const cancelSpy = vi.fn()
    const upstream = new ReadableStream<Uint8Array>({
      pull() {
        // Never resolves: keeps the wrapped stream's pull() awaiting read().
        return new Promise<void>(() => {})
      },
      cancel: cancelSpy,
    })

    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)
    try {
      const wrapped = wrapStream(makeHead(), upstream, TEMPLATE)
      const reader = wrapped.getReader()
      await reader.read() // shell
      const inFlight = reader.read() // triggers pull(), which awaits upstream forever
      await reader.cancel('mid-flight')

      // The in-flight read resolves done after cancellation.
      await expect(inFlight).resolves.toEqual({ done: true, value: undefined })
      expect(cancelSpy).toHaveBeenCalledTimes(1)
      expect(cancelSpy).toHaveBeenCalledWith('mid-flight')

      // Let the raced pull() continuation run; it must not blow up.
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(unhandled).toEqual([])
    }
    finally {
      process.off('unhandledRejection', onUnhandled)
    }
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
  it('renderSSRHeadSuspenseChunk: cyclic input throws once, bad entry dropped, valid entries survive', async () => {
    const { head } = createStreamableHead()
    head.push({ title: 'Shell' })
    renderSSRHeadShell(head, '<html><head></head><body>')

    const cyclic: any = { title: 'Bad' }
    cyclic.self = cyclic
    head.push(cyclic)
    head.push({ title: 'Good' })

    expect(() => renderSSRHeadSuspenseChunk(head)).toThrow()
    // The unserializable entry is dropped so it can't poison every later
    // chunk; the valid entry survives and flushes on the next chunk.
    expect(head.entries.size).toBe(1)

    const result = renderSSRHeadSuspenseChunk(head)
    expect(result).toContain('Good')
    expect(result).not.toContain('Bad')
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
