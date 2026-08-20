import { describe, expect, it } from 'vitest'
import { prepareStreamingTemplate, renderShell, renderSSRHeadShell, renderSSRHeadSuspenseChunk, renderStreamBodyTags, renderStreamEnd, wrapStream } from '../../src/stream/server'
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

// Streamed Body Tags render at the body-close position in `end`.
const PARTS = { shell: '', end: '</div></body></html>', bodyTagsAt: '</div>'.length }

describe('rendering JSON-LD as Streamed Body Tags', () => {
  it('keeps JSON-LD out of the patch script', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ script: [LD] })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
  })

  it('splits an entry so the rest still patches', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ title: 'Reviews', script: [LD] })

    const chunk = renderSSRHeadSuspenseChunk(head)

    expect(chunk).toContain('Reviews')
    expect(chunk).not.toContain('ld+json')
  })

  it('renders JSON-LD as a Streamed Body Tag', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ title: 'Reviews', script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    const end = renderStreamEnd(head, PARTS)

    expect(end).toContain('application/ld+json')
    expect(end).toContain('"@type":"Organization"')
  })

  it('drains JSON-LD only once', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toContain('ld+json')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('leaves pending entries alone', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)
    head.push({ title: 'Later' })

    renderStreamEnd(head, PARTS)

    expect(renderSSRHeadSuspenseChunk(head)).toContain('Later')
  })

  it('writes JSON-LD inside the body of a wrapped stream', async () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
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
    const head = createStreamableServerHead({ writesBodyTags: true })
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
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS).match(/ld\+json/g)).toHaveLength(1)
  })
})

describe('pre-rendered shell state', () => {
  it('does not repeat JSON-LD rendered by renderSSRHeadShell', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ script: [LD] })
    expect(renderSSRHeadShell(head, TEMPLATE)).toContain('Organization')

    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).not.toContain('Organization')
  })

  // Solid and Svelte pass a rendered shell payload into template preparation.
  it('keeps JSON-LD pushed after the shell render', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ title: 'Shell' })
    const shellState = renderShell(head)

    head.push({ script: [LD] })
    const parts = prepareStreamingTemplate(head, TEMPLATE, shellState)
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, parts)).toContain('Organization')
  })

  it('drops JSON-LD the shell render already emitted', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
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
  it('returns Streamed Body Tags once', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    renderShell(head)
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamBodyTags(head)).toContain('Organization')
    expect(renderStreamBodyTags(head)).toBe('')
  })
})

describe('render failures for Streamed Body Tags', () => {
  it('keeps valid JSON-LD when another entry cannot serialize', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ script: [LD] })
    head.push({ meta: [{ name: 'invalid', content: 1n }] } as any)

    expect(() => renderSSRHeadSuspenseChunk(head)).toThrow(TypeError)
    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renderStreamBodyTags(head)).toContain('Organization')
  })

  it('keeps Streamed Body Tags for a retry', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
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

    expect(() => renderStreamBodyTags(head)).toThrow('plugin blew up')
    expect(renderStreamBodyTags(head)).toContain('Organization')
  })
})
