import type { HtmlTagDescriptor } from 'unhead/vite'
import { createHead, renderSSRHead } from 'unhead/server'
import { htmlTagsToHead } from 'unhead/vite'
import { describe, expect, it } from 'vitest'

describe('htmlTagsToHead', () => {
  it('renders Vite descriptors at their requested positions', () => {
    const head = createHead({ disableDefaults: true, omitLineBreaks: true })
    head.push(htmlTagsToHead([
      { tag: 'style', children: 'body { color: red }', injectTo: 'head' },
      { tag: 'style', children: 'body { color: blue }', injectTo: 'head-prepend' },
      { tag: 'script', attrs: { src: '/start.js', async: true, defer: false }, injectTo: 'body-prepend' },
      { tag: 'script', children: 'start()', injectTo: 'body' },
    ]))

    const { headTags, bodyTagsOpen, bodyTags } = renderSSRHead(head)
    expect(headTags).toBe('<style>body { color: blue }</style>\n<style>body { color: red }</style>')
    expect(bodyTagsOpen).toBe('<script src="/start.js" async></script>')
    expect(bodyTags).toBe('<script>start()</script>')
  })

  it('dedupes a Vite preload against normal head input', () => {
    const href = '/font.woff2?a=1&b=2'
    const head = createHead({ disableDefaults: true, omitLineBreaks: true })
    head.push(htmlTagsToHead([{ tag: 'link', attrs: { rel: 'preload', href, as: 'font', crossorigin: '' } }]))
    head.push({ link: [{ rel: 'preload', href, as: 'font', crossorigin: 'anonymous' }] })

    expect(renderSSRHead(head).headTags).toBe('<link rel="preload" href="/font.woff2?a=1&b=2" as="font" crossorigin>')
  })

  it('keeps the first base href and target in Vite placement order', () => {
    const head = createHead({ disableDefaults: true, omitLineBreaks: true })
    head.push(htmlTagsToHead([
      { tag: 'base', attrs: { href: '/append/', target: '_blank' }, injectTo: 'head' },
      { tag: 'base', attrs: { HREF: '/prepend/' } },
    ]))

    expect(renderSSRHead(head).headTags).toBe('<base href="/prepend/" target="_blank">')
  })

  it.each([false, true])('rejects a module and nomodule pair with identical inline source (reversed: %s)', (reversed) => {
    const tags = [
      { tag: 'script', attrs: { type: 'MODULE' }, children: 'start()' },
      { tag: 'script', attrs: { noModule: '' }, children: 'start()' },
    ]

    expect(() => htmlTagsToHead(reversed ? tags.toReversed() : tags)).toThrow(TypeError)
  })

  it('rejects a module and nomodule pair with the same explicit identity', () => {
    expect(() => htmlTagsToHead([
      { tag: 'script', attrs: { id: 'boot', type: 'module', src: '/modern.js' } },
      { tag: 'script', attrs: { id: 'boot', nomodule: true, src: '/legacy.js' } },
    ])).toThrow(TypeError)
  })

  it('renders a module and nomodule pair with distinct IDs', () => {
    const head = createHead({ disableDefaults: true })
    head.push(htmlTagsToHead([
      { tag: 'script', attrs: { id: 'modern', type: 'module' }, children: 'start()' },
      { tag: 'script', attrs: { id: 'legacy', nomodule: true }, children: 'start()' },
    ]))

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('<script id="modern" type="module">start()</script>')
    expect(headTags).toContain('<script id="legacy" nomodule>start()</script>')
  })

  it.each(['footer', null])('rejects unsupported manifest placement %j', (injectTo) => {
    const descriptor = { tag: 'script', attrs: { src: '/entry.js' }, injectTo: injectTo as HtmlTagDescriptor['injectTo'] }

    expect(() => htmlTagsToHead([descriptor])).toThrow(TypeError)
  })

  it.each([
    { tag: 'title', children: 'Hello' },
    { tag: 'base', injectTo: 'body' },
    { tag: 'meta', attrs: { name: 'marker' } },
    { tag: 'script', attrs: { src: '/entry.js', key: 'literal' } },
    { tag: 'script', attrs: { 'src': '/entry.js', 'bad name': 'value' } },
    { tag: 'script', attrs: { src: '/entry.js', nonce: 'true' } },
    { tag: 'link', attrs: { href: '/asset?x=&copy;' } },
    { tag: 'noscript', children: [{ tag: 'img', attrs: { src: '/pixel' } }] },
  ] satisfies HtmlTagDescriptor[])('routes unsupported $tag descriptors to the HTML fallback', (descriptor) => {
    expect(() => htmlTagsToHead([descriptor])).toThrow(TypeError)
  })
})
