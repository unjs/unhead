import { describe, expect, it } from 'vitest'
import { renderShell, renderSSRHeadSuspenseChunk, renderStreamEnd } from '../../src/stream/server'
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
