import { JSDOM } from 'jsdom'
import { createHead as createClientHead } from 'unhead/client'
import { describe, expect, it } from 'vitest'
import { renderShell, renderSSRHeadSuspenseChunk, renderStreamEnd, wrapStream } from '../../src/stream/server'
import { createStreamableServerHead } from '../util'

// A driver writes `end` last, so the tail lands at the body-close slot inside it.
const PARTS = { shell: '', end: '</div></body></html>', bodyTagsAt: '</div>'.length }

const GTM = '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-1"></iframe>'

describe('noscript registered after the shell', () => {
  it('goes out as markup, not as a patch', () => {
    const head = createStreamableServerHead({ writesMarkup: true })
    head.push({ noscript: [{ innerHTML: GTM, tagPosition: 'bodyOpen' }] })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renderStreamEnd(head, PARTS)).toContain('<noscript>')
  })

  it('lands at the body close, because the body-open slot already flushed', () => {
    const head = createStreamableServerHead({ writesMarkup: true })
    head.push({ noscript: [{ innerHTML: GTM, tagPosition: 'bodyOpen' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toBe(`</div><noscript>${GTM}</noscript></body></html>`)
  })

  it('is not repeated when the shell already served it', () => {
    const head = createStreamableServerHead({ writesMarkup: true })
    head.push({ noscript: [{ innerHTML: GTM }] })
    renderShell(head)

    head.push({ noscript: [{ innerHTML: GTM }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })
})

describe('body-positioned tags registered after the shell', () => {
  it('sends a body-close script as markup', () => {
    const head = createStreamableServerHead({ writesMarkup: true })
    head.push({ script: [{ src: '/late.js', tagPosition: 'bodyClose' }] })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renderStreamEnd(head, PARTS)).toContain('<script src="/late.js"')
  })

  it('sends a body-close style as markup', () => {
    const head = createStreamableServerHead({ writesMarkup: true })
    head.push({ style: [{ innerHTML: '.a{color:red}', tagPosition: 'bodyClose' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toContain('<style>.a{color:red}</style>')
  })

  it('keeps head-positioned tags in the patch', () => {
    const head = createStreamableServerHead({ writesMarkup: true })
    head.push({ meta: [{ name: 'description', content: 'late' }], link: [{ rel: 'canonical', href: '/a' }] })

    const chunk = renderSSRHeadSuspenseChunk(head)

    expect(chunk).toContain('description')
    expect(chunk).toContain('canonical')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })
})

describe('an entry mixing hoistable and head-only tags', () => {
  it('splits it across the patch and the markup', () => {
    const head = createStreamableServerHead({ writesMarkup: true })
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
    const head = createStreamableServerHead({ writesMarkup: true })
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
    const head = createStreamableServerHead({ writesMarkup: true })
    head.push({ script: [{ key: 'schema', type: 'application/ld+json', innerHTML: '{"v":1}' }] })
    const shell = renderShell(head)
    expect(shell.headTags).toContain('{"v":1}')

    head.push({ script: [{ key: 'schema', type: 'application/ld+json', innerHTML: '{"v":2}' }] })
    const chunk = renderSSRHeadSuspenseChunk(head)

    expect(chunk).toContain('{\\"v\\":2}')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('drops an exact repeat entirely', () => {
    const head = createStreamableServerHead({ writesMarkup: true })
    head.push({ noscript: [{ key: 'gtm', innerHTML: '<i>1</i>' }] })
    renderShell(head)

    head.push({ noscript: [{ key: 'gtm', innerHTML: '<i>1</i>' }] })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('still hoists a different unkeyed block', () => {
    const head = createStreamableServerHead({ writesMarkup: true })
    head.push({ script: [{ type: 'application/ld+json', innerHTML: '{"a":1}' }] })
    renderShell(head)

    head.push({ script: [{ type: 'application/ld+json', innerHTML: '{"b":2}' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toContain('{"b":2}')
  })
})

describe('a driver that builds the response by hand', () => {
  const LD = { type: 'application/ld+json', innerHTML: '{"@type":"Organization"}' } as const

  // Nuxt renders the shell itself and writes its own closing HTML. Until it
  // writes the tail, the patch has to carry these tags or they reach nobody.
  it('keeps hoisted tags in the patch when the tail is not guaranteed', () => {
    const head = createStreamableServerHead()
    renderShell(head)
    head.push({ script: [LD], noscript: [{ innerHTML: '<img src="px.gif">' }] })

    const chunk = renderSSRHeadSuspenseChunk(head)

    expect(chunk).toContain('ld+json')
    expect(chunk).toContain('px.gif')
  })

  it('still offers them as markup, so a tail that is written wins', () => {
    const head = createStreamableServerHead()
    renderShell(head)
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toContain('ld+json')
  })

  it('does not render twice when the client applies a patch over the markup', async () => {
    const head = createStreamableServerHead()
    renderShell(head)
    head.push({ script: [LD] })
    const chunk = renderSSRHeadSuspenseChunk(head)
    const served = `<!DOCTYPE html><html><head></head><body><div id="app">app</div>${renderStreamEnd(head, PARTS)}`

    const doc = new JSDOM(served).window.document
    const client = createClientHead({ document: doc })
    for (const input of JSON.parse(chunk.slice(chunk.indexOf('(') + 1, chunk.lastIndexOf(')'))))
      client.push(input)
    await client.render()

    expect(doc.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1)
  })
})

describe('tagPosition given as an entry option', () => {
  // `useHead(input, { tagPosition })` is a documented API and resolveTags
  // applies it to every tag in the entry. The split has to see it too, or the
  // tag ships as a patch nobody but a browser reads.
  it('hoists a tag positioned by its entry', () => {
    const head = createStreamableServerHead({ writesMarkup: true })
    renderShell(head)
    head.push({ script: [{ src: '/x.js' }] }, { tagPosition: 'bodyClose' })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renderStreamEnd(head, PARTS)).toContain('/x.js')
  })

  it('leaves a head-positioned entry in the patch', () => {
    const head = createStreamableServerHead({ writesMarkup: true })
    renderShell(head)
    head.push({ meta: [{ name: 'description', content: 'x' }] }, { tagPosition: 'head' })

    expect(renderSSRHeadSuspenseChunk(head)).toContain('description')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('lets a tag override its entry position', () => {
    const head = createStreamableServerHead({ writesMarkup: true })
    renderShell(head)
    head.push({ script: [{ src: '/keep.js', tagPosition: 'head' }] }, { tagPosition: 'bodyClose' })

    expect(renderSSRHeadSuspenseChunk(head)).toContain('/keep.js')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })
})
