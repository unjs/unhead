import { describe, expect, it } from 'vitest'
import { renderSSRHeadSuspenseChunk, renderStreamEnd, wrapStream } from '../../src/stream/server'
import { createStreamableServerHead } from '../util'

const TEMPLATE = '<!DOCTYPE html><html><head></head><body><div id="app"><!--app-html--></div></body></html>'

function streamOf(chunks: string[]) {
  const enc = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks)
        controller.enqueue(enc.encode(c))
      controller.close()
    },
  })
}

async function readAll(stream: ReadableStream<Uint8Array>) {
  const dec = new TextDecoder()
  const reader = stream.getReader()
  let out = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done)
      break
    out += dec.decode(value)
  }
  return out
}

const LD = { type: 'application/ld+json', innerHTML: '{"@type":"Organization"}' } as const

// A driver writes `end` last, so the tail lands at the body-close slot inside it.
const PARTS = { shell: '', end: '</div></body></html>', bodyTagsAt: '</div>'.length }

describe('jSON-LD held back from streamed patches', () => {
  it('keeps JSON-LD out of the patch script', () => {
    const head = createStreamableServerHead()
    head.push({ script: [LD] })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
  })

  it('splits an entry so the rest still patches', () => {
    const head = createStreamableServerHead()
    head.push({ title: 'Reviews', script: [LD] })

    const chunk = renderSSRHeadSuspenseChunk(head)

    expect(chunk).toContain('Reviews')
    expect(chunk).not.toContain('ld+json')
  })

  it('renders the held JSON-LD as markup', () => {
    const head = createStreamableServerHead()
    head.push({ title: 'Reviews', script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    const tail = renderStreamEnd(head, PARTS)

    expect(tail).toContain('application/ld+json')
    expect(tail).toContain('"@type":"Organization"')
  })

  it('drains the held JSON-LD only once', () => {
    const head = createStreamableServerHead()
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toContain('ld+json')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('leaves pending entries alone', () => {
    const head = createStreamableServerHead()
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)
    head.push({ title: 'Later' })

    renderStreamEnd(head, PARTS)

    expect(renderSSRHeadSuspenseChunk(head)).toContain('Later')
  })

  it('emits the JSON-LD inside the body of a wrapped stream', async () => {
    const head = createStreamableServerHead()
    head.push({ title: 'Shell' })
    let pending = true
    const html = await readAll(wrapStream(head, streamOf(['<p>app</p>']), TEMPLATE, undefined, {
      flushChunk: () => {
        if (!pending)
          return ''
        pending = false
        head.push({ script: [LD] })
        return renderSSRHeadSuspenseChunk(head)
      },
    }))

    const ld = html.indexOf('application/ld+json')
    expect(ld).toBeGreaterThan(-1)
    expect(ld).toBeLessThan(html.indexOf('</body>'))
    expect(html).not.toContain('__unhead__.push')
  })
  it('does not repeat JSON-LD the shell already rendered', async () => {
    const head = createStreamableServerHead()
    head.push({ script: [LD] })
    let once = true
    const html = await readAll(wrapStream(head, streamOf(['<p>app</p>']), TEMPLATE, undefined, {
      flushChunk: () => {
        if (!once)
          return ''
        once = false
        head.push({ script: [LD] })
        return renderSSRHeadSuspenseChunk(head)
      },
    }))

    expect(html.match(/ld\+json/g)).toHaveLength(1)
  })

  it('does not repeat JSON-LD across two chunks', () => {
    const head = createStreamableServerHead()
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS).match(/ld\+json/g)).toHaveLength(1)
  })
})
