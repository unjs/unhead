import { runInNewContext } from 'node:vm'
import { JSDOM } from 'jsdom'
import { createHead as createClientHead } from 'unhead/client'
import { createHead, renderSSRHead } from 'unhead/server'
import { createStreamableHead, renderShell, renderSSRHeadSuspenseChunk, renderStreamBodyTags } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

function render(input: any) {
  const head = createHead({ disableDefaults: true })
  head.push(input)
  return renderSSRHead(head)
}

function documentFor(html: string) {
  return new JSDOM(`<html><head>${html}</head><body></body></html>`).window.document
}

describe('literal attribute input', () => {
  it('keeps attributes separate from head controls', () => {
    const html = render({ script: [{ attrs: { src: '/app.js', key: 'html-key', innerHTML: 'html-value', tagPosition: 'bodyClose' }, tagPosition: 'head' }] })
    const script = documentFor(html.headTags).querySelector('script')!
    expect(script.getAttribute('key')).toBe('html-key')
    expect(script.getAttribute('innerhtml')).toBe('html-value')
    expect(script.getAttribute('tagposition')).toBe('bodyClose')
    expect(script.textContent).toBe('')
    expect(html.bodyTags).toBe('')
  })

  it('escapes literal attributes once and keeps normal template-value semantics', () => {
    const html = render({ meta: [
      { name: 'legacy', content: '&copy;' },
      { attrs: { 'name': 'literal', 'content': '&copy;', 'data-enabled': true } },
    ] })
    const document = documentFor(html.headTags)
    expect(document.querySelector('meta[name="legacy"]')?.getAttribute('content')).toBe('©')
    expect(document.querySelector('meta[name="literal"]')?.getAttribute('content')).toBe('&copy;')
    expect(document.querySelector('meta[name="literal"]')?.getAttribute('data-enabled')).toBe('')
  })

  it('retains literal marker meta and preserves normal meta removal', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ meta: [{ name: 'description', content: 'old' }] })
    head.push({ meta: [{ name: 'description', content: null }, { attrs: { name: 'marker' } }] } as any)
    const document = documentFor(renderSSRHead(head).headTags)
    expect(document.querySelector('meta[name="description"]')).toBeNull()
    expect(document.querySelector('meta[name="marker"]')?.outerHTML).toBe('<meta name="marker">')
  })

  it('omits disabled literal class and style attributes', () => {
    const html = render({ script: [{ attrs: { src: '/app.js', class: false, style: null } }] })
    const script = documentFor(html.headTags).querySelector('script')!
    expect(script.hasAttribute('class')).toBe(false)
    expect(script.hasAttribute('style')).toBe(false)
  })

  it.each(['htmlAttrs', 'bodyAttrs'] as const)('carries each winning attribute encoding through %s merges', (tag) => {
    const head = createHead({ disableDefaults: true })
    head.push({ [tag]: { 'data-legacy': '&copy;', 'data-replaced': '&copy;' } })
    head.push({ [tag]: { attrs: { 'data-literal': '&copy;', 'data-replaced': '&copy;' } } })
    head.push({ [tag]: { 'data-literal': '&copy;' } })
    const html = renderSSRHead(head)[tag]
    const document = documentFor(`<meta${html}>`)
    const meta = document.querySelector('meta')!
    expect(meta.getAttribute('data-legacy')).toBe('©')
    expect(meta.getAttribute('data-replaced')).toBe('&copy;')
    expect(meta.getAttribute('data-literal')).toBe('©')
  })

  it('replaces raw style values atomically during a merge', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ script: [{ id: 'merged', style: { color: 'red' } }] } as any)
    head.push({ script: [{ attrs: { id: 'merged', style: 'display:flex;display:grid' }, tagDuplicateStrategy: 'merge' }] } as any)
    expect(documentFor(renderSSRHead(head).headTags).querySelector('script')?.getAttribute('style')).toBe('display:flex;display:grid')
  })

  it('adopts server attributes after a JSON round trip', () => {
    const input = { script: [{ attrs: { src: '/app.js?a=1&b=2', key: 'attribute', style: '', class: '' } }] }
    const document = documentFor(render(input).headTags)
    const existing = document.querySelector('script')!
    const head = createClientHead({ document })
    head.push(JSON.parse(JSON.stringify(input)))
    head.render()
    expect(document.querySelectorAll('script')).toHaveLength(1)
    expect(document.querySelector('script')).toBe(existing)
    expect(existing.getAttribute('src')).toBe('/app.js?a=1&b=2')
  })

  it('replays literal attributes from a late streaming entry', () => {
    const head = createHead({ disableDefaults: true })
    renderShell(head)
    head.push({ meta: [{ attrs: { name: 'late', content: '&copy;' } }] } as any)
    const queue: any[][] = []
    const patch = renderSSRHeadSuspenseChunk(head)
    runInNewContext(patch, { window: { __unhead__: { push: (entries: any[]) => queue.push(entries) } } })
    const document = documentFor('')
    const client = createClientHead({ document })
    for (const entries of queue)
      entries.forEach(entry => client.push(entry))
    client.render()
    expect(document.querySelector('meta[name="late"]')?.getAttribute('content')).toBe('&copy;')
  })

  it.each(['type', 'TYPE'])('writes late JSON-LD with literal %s attributes into the body', (name) => {
    const { head } = createStreamableHead({ disableDefaults: true, writesBodyTags: true })
    renderShell(head)
    head.push({ script: [{ attrs: { [name]: 'application/ld+json', 'data-copy': '&copy;' }, innerHTML: '{"@type":"Organization"}' }] })
    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    const html = renderStreamBodyTags(head)
    const script = documentFor(html).querySelector('script')!
    expect(script.getAttribute('type')).toBe('application/ld+json')
    expect(script.getAttribute('data-copy')).toBe('&copy;')
    expect(script.textContent).toBe('{"@type":"Organization"}')
    expect(renderStreamBodyTags(head)).toBe('')
  })
})
