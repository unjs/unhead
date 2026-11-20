import type { HtmlTagDescriptor } from 'unhead/vite'
import { createHead, renderSSRHead } from 'unhead/server'
import { htmlTagsToHead } from 'unhead/vite'
import { describe, expect, it } from 'vitest'

describe('htmlTagsToHead', () => {
  it('renders Vite descriptors at their requested positions', () => {
    const head = createHead({ disableDefaults: true, omitLineBreaks: true })
    head.push(htmlTagsToHead([
      { tag: 'style', children: 'body { color: red }', injectTo: 'head' },
      { tag: 'style', children: 'body { color: blue }' },
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
