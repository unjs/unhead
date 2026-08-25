import type { HtmlTagDescriptor } from '../../src/vite'
import { describe, expect, it } from 'vitest'
import { renderSSRHead } from '../../src/server'
import { htmlTagsToHead } from '../../src/vite'
import { createServerHeadWithContext } from '../util'

describe('htmlTagsToHead', () => {
  it('positions head-prepend before explicit head, and maps body-prepend/body', () => {
    const head = createServerHeadWithContext()

    const tags: HtmlTagDescriptor[] = [
      { tag: 'meta', attrs: { name: 'generator', content: 'vite' }, injectTo: 'head' },
      { tag: 'link', attrs: { rel: 'modulepreload', href: '/entry.js' }, injectTo: 'head-prepend' },
      { tag: 'script', attrs: { src: '/loader.js' }, injectTo: 'body-prepend' },
      { tag: 'script', attrs: { src: '/analytics.js' }, injectTo: 'body' },
    ]

    head.push(htmlTagsToHead(tags))
    const { headTags, bodyTags, bodyTagsOpen } = renderSSRHead(head)

    // head-prepend renders before the explicit-head meta tag
    expect(headTags.indexOf('modulepreload')).toBeLessThan(headTags.indexOf('generator'))
    expect(bodyTagsOpen).toContain('/loader.js')
    expect(bodyTags).toContain('/analytics.js')
  })

  it('treats an omitted injectTo as head-prepend, matching Vite\'s own default', () => {
    const result = htmlTagsToHead([
      { tag: 'link', attrs: { rel: 'modulepreload', href: '/entry.js' } },
    ])
    expect(result.link?.[0]).toMatchObject({ tagPosition: 'head', tagPriority: 'high' })
  })

  it('dedupes against a user-pushed identical preload link', () => {
    const head = createServerHeadWithContext()

    head.push({
      link: [{ rel: 'preload', as: 'style', href: '/app.css' }],
    })
    head.push(htmlTagsToHead([
      { tag: 'link', attrs: { rel: 'preload', as: 'style', href: '/app.css' }, injectTo: 'head-prepend' },
    ]))

    const { headTags } = renderSSRHead(head)
    expect(headTags.match(/<link[^>]*rel="preload"/g)).toHaveLength(1)
  })

  it('preserves innerHTML for script children', () => {
    const head = createServerHeadWithContext()

    head.push(htmlTagsToHead([
      { tag: 'script', children: 'window.__INITIAL__ = {}', injectTo: 'head' },
    ]))

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('window.__INITIAL__ = {}')
  })

  it('maps boolean true attrs to bare props and omits false/undefined', () => {
    const head = createServerHeadWithContext()

    head.push(htmlTagsToHead([
      { tag: 'script', attrs: { src: '/x.js', async: true, defer: false, crossorigin: undefined }, injectTo: 'head' },
    ]))

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('async')
    expect(headTags).not.toContain('defer')
    expect(headTags).not.toContain('crossorigin')
  })

  it('skips unknown tag names without throwing', () => {
    expect(() => htmlTagsToHead([
      { tag: 'div', attrs: { id: 'root' } },
    ])).not.toThrow()

    const result = htmlTagsToHead([
      { tag: 'div', attrs: { id: 'root' } },
      { tag: 'meta', attrs: { name: 'generator', content: 'vite' }, injectTo: 'head' },
    ])
    expect(result).toEqual({ meta: [{ name: 'generator', content: 'vite' }] })
  })

  it('renders nested children arrays to an inner HTML string', () => {
    const result = htmlTagsToHead([
      {
        tag: 'script',
        attrs: { type: 'application/json' },
        injectTo: 'head',
        children: [
          { tag: 'span', attrs: { id: 'a' }, children: 'hi' },
        ],
      },
    ])
    expect(result.script?.[0]?.innerHTML).toBe('<span id="a">hi</span>')
  })

  it('escapes attribute values and text when rendering nested children', () => {
    const result = htmlTagsToHead([
      {
        tag: 'script',
        attrs: { type: 'application/json' },
        injectTo: 'head',
        children: [
          { tag: 'span', attrs: { title: '"><script>alert(1)</script>' }, children: '</span><script>alert(2)</script>' },
        ],
      },
    ])
    const html = result.script?.[0]?.innerHTML as string
    expect(html).not.toContain('"><script>')
    expect(html).not.toContain('</span><script>')
    expect(html).toBe('<span title="&quot;&gt;&lt;script&gt;alert(1)&lt;&#x2F;script&gt;">&lt;&#x2F;span&gt;&lt;script&gt;alert(2)&lt;&#x2F;script&gt;</span>')
  })

  it('keeps the first base href and target across multiple descriptors', () => {
    const result = htmlTagsToHead([
      { tag: 'base', attrs: { href: '/first/', target: '_self' } },
      { tag: 'base', attrs: { href: '/second/', target: '_blank' } },
    ])
    expect(result.base).toMatchObject({ href: '/first/', target: '_self' })
  })
})
