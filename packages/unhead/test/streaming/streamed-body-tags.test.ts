import { JSDOM } from 'jsdom'
import { createHead as createClientHead } from 'unhead/client'
import { describe, expect, it } from 'vitest'
import { renderShell, renderSSRHeadSuspenseChunk, renderStreamEnd, wrapStream } from '../../src/stream/server'
import { createStreamableServerHead } from '../util'

// Streamed Body Tags render at the body-close position in `end`.
const PARTS = { shell: '', end: '</div></body></html>', bodyTagsAt: '</div>'.length }

const GTM = '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-1"></iframe>'

describe('noscript registered after the shell', () => {
  it('writes noscript as a Streamed Body Tag', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ noscript: [{ innerHTML: GTM, tagPosition: 'bodyOpen' }] })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renderStreamEnd(head, PARTS)).toContain('<noscript>')
  })

  it('lands at the body close, because the body-open slot already flushed', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ noscript: [{ innerHTML: GTM, tagPosition: 'bodyOpen' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toBe(`</div><noscript>${GTM}</noscript></body></html>`)
  })

  it('is not repeated when the shell already served it', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ noscript: [{ innerHTML: GTM }] })
    renderShell(head)

    head.push({ noscript: [{ innerHTML: GTM }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })
})

describe('body-positioned tags registered after the shell', () => {
  it('writes a body-close script as a Streamed Body Tag', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ script: [{ src: '/late.js', tagPosition: 'bodyClose' }] })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renderStreamEnd(head, PARTS)).toContain('<script src="/late.js"')
  })

  it('writes a body-close style as a Streamed Body Tag', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ style: [{ innerHTML: '.a{color:red}', tagPosition: 'bodyClose' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toContain('<style>.a{color:red}</style>')
  })

  it('keeps head-positioned tags in the patch', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ meta: [{ name: 'description', content: 'late' }], link: [{ rel: 'canonical', href: '/a' }] })

    const chunk = renderSSRHeadSuspenseChunk(head)

    expect(chunk).toContain('description')
    expect(chunk).toContain('canonical')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })
})

describe('an entry with patch tags and Streamed Body Tags', () => {
  it('splits each tag into the correct output', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({
      meta: [{ name: 'description', content: 'late' }],
      noscript: [{ innerHTML: GTM }],
      script: [{ src: '/head.js' }, { src: '/streamed-body.js', tagPosition: 'bodyClose' }],
    })

    const chunk = renderSSRHeadSuspenseChunk(head)
    const end = renderStreamEnd(head, PARTS)

    expect(chunk).toContain('description')
    expect(chunk).toContain('/head.js')
    expect(chunk).not.toContain('/streamed-body.js')
    expect(chunk).not.toContain('noscript')
    expect(end).toContain('/streamed-body.js')
    expect(end).toContain('<noscript>')
    expect(end).not.toContain('/head.js')
  })
})

describe('a stream that pauses mid-element', () => {
  // Vue may pause inside `<select>`. Streamed Body Tags remain body children.
  it('renders Streamed Body Tags outside the open select', async () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
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
  it('patches a keyed update instead of writing a duplicate', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ script: [{ key: 'schema', type: 'application/ld+json', innerHTML: '{"v":1}' }] })
    const shell = renderShell(head)
    expect(shell.headTags).toContain('{"v":1}')

    head.push({ script: [{ key: 'schema', type: 'application/ld+json', innerHTML: '{"v":2}' }] })
    const chunk = renderSSRHeadSuspenseChunk(head)

    expect(chunk).toContain('{\\"v\\":2}')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('drops an exact repeat entirely', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ noscript: [{ key: 'gtm', innerHTML: '<i>1</i>' }] })
    renderShell(head)

    head.push({ noscript: [{ key: 'gtm', innerHTML: '<i>1</i>' }] })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('writes a different unkeyed Streamed Body Tag', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push({ script: [{ type: 'application/ld+json', innerHTML: '{"a":1}' }] })
    renderShell(head)

    head.push({ script: [{ type: 'application/ld+json', innerHTML: '{"b":2}' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toContain('{"b":2}')
  })
})

describe('a driver that builds the response by hand', () => {
  const LD = { type: 'application/ld+json', innerHTML: '{"@type":"Organization"}' } as const

  it('keeps Streamed Body Tags in the patch until the driver opts in', () => {
    const head = createStreamableServerHead()
    renderShell(head)
    head.push({ script: [LD], noscript: [{ innerHTML: '<img src="px.gif">' }] })

    const chunk = renderSSRHeadSuspenseChunk(head)

    expect(chunk).toContain('ld+json')
    expect(chunk).toContain('px.gif')
  })

  it('does not buffer Streamed Body Tags until the driver opts in', () => {
    const head = createStreamableServerHead()
    renderShell(head)
    head.push({ script: [LD] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('does not append body tags after its fallback patch renders', async () => {
    const head = createStreamableServerHead()
    renderShell(head)
    head.push({ script: [LD] })
    const chunk = renderSSRHeadSuspenseChunk(head)

    const doc = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>').window.document
    const client = createClientHead({ document: doc })
    for (const input of JSON.parse(chunk.slice(chunk.indexOf('(') + 1, chunk.lastIndexOf(')'))))
      client.push(input)
    await client.render()
    doc.body.insertAdjacentHTML('beforeend', renderStreamEnd(head, { shell: '', end: '' }))

    expect(doc.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1)
  })

  it('does not duplicate a Streamed Body Tag after a client patch', async () => {
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
  it('writes an entry-positioned Streamed Body Tag', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    renderShell(head)
    head.push({ script: [{ src: '/x.js' }] }, { tagPosition: 'bodyClose' })

    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renderStreamEnd(head, PARTS)).toContain('/x.js')
  })

  it('leaves a head-positioned entry in the patch', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    renderShell(head)
    head.push({ meta: [{ name: 'description', content: 'x' }] }, { tagPosition: 'head' })

    expect(renderSSRHeadSuspenseChunk(head)).toContain('description')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('lets a tag override its entry position', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    renderShell(head)
    head.push({ script: [{ src: '/keep.js', tagPosition: 'head' }] }, { tagPosition: 'bodyClose' })

    expect(renderSSRHeadSuspenseChunk(head)).toContain('/keep.js')
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })
})

describe('a slot the shell filled, without an explicit key', () => {
  it.each([
    ['canonical', { link: [{ rel: 'canonical', href: '/a', tagPosition: 'bodyClose' }] }, { link: [{ rel: 'canonical', href: '/b', tagPosition: 'bodyClose' }] }, '/b'],
    ['description', { meta: [{ name: 'description', content: 'v1', tagPosition: 'bodyClose' }] }, { meta: [{ name: 'description', content: 'v2', tagPosition: 'bodyClose' }] }, 'v2'],
  ])('patches an update to %s rather than serving a second one', (_name, first, second, updated) => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push(first as any)
    renderShell(head)

    head.push(second as any)

    expect(renderSSRHeadSuspenseChunk(head)).toContain(updated)
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })
})

describe('an entry whose input is resolved lazily', () => {
  it('resolves the shell input once', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    let calls = 0
    head.push((() => ({ script: [{ type: 'application/ld+json', innerHTML: `{"v":${++calls}}` }] })) as any)

    expect(renderShell(head).headTags).toContain('{"v":1}')
    expect(calls).toBe(1)

    head.push({ script: [{ type: 'application/ld+json', innerHTML: '{"v":1}' }] })
    renderSSRHeadSuspenseChunk(head)
    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })

  it('remembers what the shell served from a function entry', () => {
    const head = createStreamableServerHead({ writesBodyTags: true })
    head.push((() => ({ script: [{ type: 'application/ld+json', innerHTML: '{"@type":"Org"}' }] })) as any)
    expect(renderShell(head).headTags).toContain('ld+json')

    head.push({ script: [{ type: 'application/ld+json', innerHTML: '{"@type":"Org"}' }] })
    renderSSRHeadSuspenseChunk(head)

    expect(renderStreamEnd(head, PARTS)).toBe(PARTS.end)
  })
})
