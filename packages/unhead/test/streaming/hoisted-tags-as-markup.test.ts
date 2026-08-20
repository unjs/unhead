import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { renderShell, renderSSRHeadSuspenseChunk, renderStreamEnd, wrapStream } from '../../src/stream/server'
import { createStreamableServerHead } from '../util'

// A driver writes `end` last, so the tail lands at the body-close slot inside it.
const PARTS = { shell: '', end: '</div></body></html>', bodyTagsAt: '</div>'.length }

const GTM = '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-1"></iframe>'

describe('noscript registered after the shell', () => {
  it('goes out as markup, not as a patch', () => {
    const head = createStreamableServerHead()
    head.push({ noscript: [{ innerHTML: GTM, tagPosition: 'bodyOpen' }] })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renderStreamEnd(head, PARTS)).toContain('<noscript>')
  })

  it('lands at the body close, because the body-open slot already flushed', () => {
    const head = createStreamableServerHead()
    head.push({ noscript: [{ innerHTML: GTM, tagPosition: 'bodyOpen' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toBe(`</div><noscript>${GTM}</noscript></body></html>`)
  })

  it('is not repeated when the shell already served it', () => {
    const head = createStreamableServerHead()
    head.push({ noscript: [{ innerHTML: GTM }] })
    renderShell(head)

    head.push({ noscript: [{ innerHTML: GTM }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })
})

describe('body-positioned tags registered after the shell', () => {
  it('sends a body-close script as markup', () => {
    const head = createStreamableServerHead()
    head.push({ script: [{ src: '/late.js', tagPosition: 'bodyClose' }] })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renderStreamEnd(head, PARTS)).toContain('<script src="/late.js"')
  })

  it('sends a body-close style as markup', () => {
    const head = createStreamableServerHead()
    head.push({ style: [{ innerHTML: '.a{color:red}', tagPosition: 'bodyClose' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toContain('<style>.a{color:red}</style>')
  })

  it('keeps head-positioned tags in the patch', () => {
    const head = createStreamableServerHead()
    head.push({ meta: [{ name: 'description', content: 'late' }], link: [{ rel: 'canonical', href: '/a' }] })

    const chunk = renderSSRHeadSuspenseChunk(head)

    expect(chunk).toContain('description')
    expect(chunk).toContain('canonical')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })
})

describe('an entry mixing hoistable and head-only tags', () => {
  it('splits it across the patch and the markup', () => {
    const head = createStreamableServerHead()
    head.push({
      meta: [{ name: 'description', content: 'late' }],
      noscript: [{ innerHTML: GTM }],
      script: [{ src: '/head.js' }, { src: '/tail.js', tagPosition: 'bodyClose' }],
    })

    const chunk = renderSSRHeadSuspenseChunk(head)
    const end = renderStreamEnd(head, PARTS)

    expect(chunk).toContain('description')
    expect(chunk).toContain('/head.js')
    expect(chunk).not.toContain('/tail.js')
    expect(chunk).not.toContain('noscript')
    expect(end).toContain('/tail.js')
    expect(end).toContain('<noscript>')
    expect(end).not.toContain('/head.js')
  })
})

describe('a stream that pauses mid-element', () => {
  // Vue flushes inside an open element: an async <option> parks the reader in
  // <select>, where the parser drops an injected noscript outright. The tail
  // is written into the template, so it lands at body level whatever the app
  // was in the middle of.
  it('parses the hoisted markup into the body, not the open select', async () => {
    const head = createStreamableServerHead()
    const template = '<!DOCTYPE html><html><head></head><body><div id="app"><!--app-html--></div></body></html>'
    const enc = new TextEncoder()
    let app!: ReadableStreamDefaultController<Uint8Array>
    const reader = wrapStream(head, new ReadableStream<Uint8Array>({ start: c => void (app = c) }), template).getReader()

    const drive = (async () => {
      app.enqueue(enc.encode('<select><option>first</option>'))
      await Promise.resolve()
      head.push({ noscript: [{ innerHTML: '<img src="px.gif">' }] })
      app.enqueue(enc.encode('<option>second</option></select>'))
      await Promise.resolve()
      app.close()
    })()

    const dec = new TextDecoder()
    let html = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done)
        break
      html += dec.decode(value)
    }
    await drive

    const doc = new JSDOM(html).window.document
    const noscript = doc.body.querySelector('noscript')
    expect(noscript).not.toBeNull()
    expect(doc.querySelector('select')!.contains(noscript!)).toBe(false)
    expect(doc.querySelectorAll('option')).toHaveLength(2)
  })
})

describe('a tag the shell already served', () => {
  // The head bytes are gone, so a post-shell update cannot replace the shell's
  // copy. Hoisting a second one would put two blocks with the same key in the
  // served HTML. The patch can still update the first for a JS client.
  it('patches an update to a keyed tag instead of hoisting a duplicate', () => {
    const head = createStreamableServerHead()
    head.push({ script: [{ key: 'schema', type: 'application/ld+json', innerHTML: '{"v":1}' }] })
    const shell = renderShell(head)
    expect(shell.headTags).toContain('{"v":1}')

    head.push({ script: [{ key: 'schema', type: 'application/ld+json', innerHTML: '{"v":2}' }] })
    const chunk = renderSSRHeadSuspenseChunk(head)

    expect(chunk).toContain('{\\"v\\":2}')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('drops an exact repeat entirely', () => {
    const head = createStreamableServerHead()
    head.push({ noscript: [{ key: 'gtm', innerHTML: '<i>1</i>' }] })
    renderShell(head)

    head.push({ noscript: [{ key: 'gtm', innerHTML: '<i>1</i>' }] })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('still hoists a different unkeyed block', () => {
    const head = createStreamableServerHead()
    head.push({ script: [{ type: 'application/ld+json', innerHTML: '{"a":1}' }] })
    renderShell(head)

    head.push({ script: [{ type: 'application/ld+json', innerHTML: '{"b":2}' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toContain('{"b":2}')
  })
})
