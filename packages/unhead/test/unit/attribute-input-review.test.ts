import { JSDOM } from 'jsdom'
import { createHead as createClientHead } from 'unhead/client'
import { SafeInputPlugin } from 'unhead/plugins'
import { createHead, renderSSRHead } from 'unhead/server'
import { htmlTagsToHead } from 'unhead/vite'
import { describe, expect, it } from 'vitest'

describe('attribute input review regressions', () => {
  it.each([false, true])('adopts data-hid attributes with explicit key %j', (keyed) => {
    const input = htmlTagsToHead([{ tag: 'script', attrs: { 'src': '/asset.js', 'data-hid': 'plugin-value' } }])
    if (keyed)
      input.script![0]!.key = 'managed-key'
    const server = createHead({ disableDefaults: true })
    server.push(input)
    const document = new JSDOM(`<html><head>${renderSSRHead(server).headTags}</head><body></body></html>`).window.document
    const original = document.querySelector('script')!
    const client = createClientHead({ document })
    client.push(input)
    client.render()
    expect(document.querySelectorAll('script')).toHaveLength(1)
    expect(document.querySelector('script')).toBe(original)
    expect(original.getAttribute('data-hid')).toBe(keyed ? 'managed-key' : 'plugin-value')
  })

  it.each(['SSR', 'client'] as const)('keeps safe empty meta removal during %s', (mode) => {
    const document = new JSDOM('<html><head></head><body></body></html>').window.document
    const head = mode === 'SSR'
      ? createHead({ disableDefaults: true, plugins: [SafeInputPlugin] })
      : createClientHead({ document, plugins: [SafeInputPlugin] })
    head.push({ meta: [{ name: 'description', content: 'old' }] })
    head.push({ meta: [{ name: 'description', content: '' }, { attrs: { name: 'marker' } }] }, { _safe: true })
    if (mode === 'SSR')
      document.head.innerHTML = renderSSRHead(head as ReturnType<typeof createHead>).headTags
    else
      head.render()
    expect(document.querySelector('meta[name="description"]')).toBeNull()
    expect(document.querySelector('meta[name="marker"]')?.outerHTML).toBe('<meta name="marker">')
  })

  it('adopts distinct literal and managed keys with identical HTML attributes', () => {
    const input = { script: [
      { attrs: { 'src': '/asset.js', 'data-hid': 'same' } },
      { src: '/asset.js', key: 'same' },
    ] }
    const server = createHead({ disableDefaults: true })
    server.push(input)
    const document = new JSDOM(`<html><head>${renderSSRHead(server).headTags}</head><body></body></html>`).window.document
    const original = [...document.querySelectorAll('script')]
    const client = createClientHead({ document })
    client.push(input)
    client.render()
    expect(document.querySelectorAll('script')).toHaveLength(2)
    original.forEach((script, index) => expect(document.querySelectorAll('script')[index]).toBe(script))
  })

  it.each(['htmlAttrs', 'bodyAttrs'] as const)('cleans raw unsupported style on %s updates and disposal', (tag) => {
    const document = new JSDOM('<html><head></head><body></body></html>').window.document
    const head = createClientHead({ document })
    const entry = head.push({ [tag]: { attrs: { style: 'unknown-css-property:value' } } })
    const element = tag === 'htmlAttrs' ? document.documentElement : document.body
    head.render()
    expect(element.getAttribute('style')).toBe('unknown-css-property:value')
    entry.patch({ [tag]: { attrs: {} } })
    head.render()
    expect(element.getAttribute('style')).toBeNull()
    entry.patch({ [tag]: { attrs: { style: 'unknown-css-property:updated' } } })
    head.render()
    entry.dispose()
    head.render()
    expect(element.getAttribute('style')).toBeNull()
  })

  it.each(['htmlAttrs', 'bodyAttrs'] as const)('preserves external style changes on %s disposal', (tag) => {
    const document = new JSDOM('<html><head></head><body></body></html>').window.document
    const head = createClientHead({ document })
    const entry = head.push({ [tag]: { attrs: { style: 'unknown-css-property:value' } } })
    const element = tag === 'htmlAttrs' ? document.documentElement : document.body
    head.render()
    element.setAttribute('style', 'color: blue')
    entry.dispose()
    head.render()
    expect(element.getAttribute('style')).toBe('color: blue')
  })
})
