import { describe, expect, it } from 'vitest'
import { prepareStreamingTemplate, renderShell, renderSSRHeadSuspenseChunk, renderStreamEnd, renderStreamTail, wrapStream } from '../../src/stream/server'
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
    const head = createStreamableServerHead({ streamTail: true })
    head.push({ script: [LD] })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
  })

  it('splits an entry so the rest still patches', () => {
    const head = createStreamableServerHead({ streamTail: true })
    head.push({ title: 'Reviews', script: [LD] })

    const chunk = renderSSRHeadSuspenseChunk(head)

    expect(chunk).toContain('Reviews')
    expect(chunk).not.toContain('ld+json')
  })

  it('renders the held JSON-LD as markup', () => {
    const head = createStreamableServerHead({ streamTail: true })
    head.push({ title: 'Reviews', script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    const tail = renderStreamEnd(head, PARTS)

    expect(tail).toContain('application/ld+json')
    expect(tail).toContain('"@type":"Organization"')
  })

  it('drains the held JSON-LD only once', () => {
    const head = createStreamableServerHead({ streamTail: true })
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toContain('ld+json')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('leaves pending entries alone', () => {
    const head = createStreamableServerHead({ streamTail: true })
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)
    head.push({ title: 'Later' })

    renderStreamEnd(head, PARTS)

    expect(renderSSRHeadSuspenseChunk(head)).toContain('Later')
  })

  it('emits the JSON-LD inside the body of a wrapped stream', async () => {
    const head = createStreamableServerHead({ streamTail: true })
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
    const head = createStreamableServerHead({ streamTail: true })
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
    const head = createStreamableServerHead({ streamTail: true })
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS).match(/ld\+json/g)).toHaveLength(1)
  })
})

describe('pre-rendered shell state', () => {
  // Solid and Svelte render the shell themselves, then hand the payload to
  // `prepareStreamingTemplate`. Entries pushed after that render belong to the
  // stream, not the shell.
  it('keeps JSON-LD pushed after the shell render', () => {
    const head = createStreamableServerHead({ streamTail: true })
    head.push({ title: 'Shell' })
    const shellState = renderShell(head)

    head.push({ script: [LD] })
    const parts = prepareStreamingTemplate(head, TEMPLATE, shellState)
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, parts)).toContain('Organization')
  })

  it('drops JSON-LD the shell render already emitted', () => {
    const head = createStreamableServerHead({ streamTail: true })
    head.push({ script: [LD] })
    const shellState = renderShell(head)

    const parts = prepareStreamingTemplate(head, TEMPLATE, shellState)
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    expect(shellState.headTags).toContain('Organization')
    expect(renderStreamEnd(head, parts)).not.toContain('Organization')
  })
})

describe('template-free drivers', () => {
  it('hands the held JSON-LD back once', () => {
    const head = createStreamableServerHead({ streamTail: true })
    renderShell(head)
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamTail(head)).toContain('Organization')
    expect(renderStreamTail(head)).toBe('')
  })
})

describe('tail render failure', () => {
  it('keeps the held JSON-LD for a retry', () => {
    const head = createStreamableServerHead({ streamTail: true })
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    const render = head.render.bind(head)
    let boom = true
    head.render = () => {
      if (boom) {
        boom = false
        throw new Error('plugin blew up')
      }
      return render()
    }

    expect(() => renderStreamTail(head)).toThrow('plugin blew up')
    expect(renderStreamTail(head)).toContain('Organization')
  })
})
