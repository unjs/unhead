import type { ResolvableHead } from '../../src/types'
import type { HtmlTagDescriptor } from '../../src/vite'
import { describe, expect, it } from 'vitest'
import { renderDOMHead } from '../../src/client'
import { renderSSRHead } from '../../src/server'
import { htmlTagsToHead } from '../../src/vite'
import { createClientHeadWithContext, createServerHeadWithContext, useDom } from '../util'

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

  it('keeps raw attributes and dedupes an identical user link', () => {
    const head = createServerHeadWithContext()
    const href = '/app.css?v=1&theme=dark'

    head.push({
      link: [{ rel: 'preload', as: 'style', href }],
    })
    const converted = htmlTagsToHead([
      { tag: 'link', attrs: { rel: 'preload', as: 'style', href }, injectTo: 'head-prepend' },
    ])
    expect(converted.link?.[0]?.href).toBe(href)
    head.push(converted)

    const { headTags } = renderSSRHead(head)
    expect(headTags.match(/<link[^>]*rel="preload"/g)).toHaveLength(1)
    expect(headTags).toContain('href="/app.css?v=1&amp;theme=dark"')
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

  it('preserves Vite string attributes during SSR', () => {
    const head = createServerHeadWithContext()

    head.push(htmlTagsToHead([
      { tag: 'script', attrs: { nonce: 'true', title: '' }, children: 'window.vite = true' },
    ]))

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('nonce="true"')
    expect(headTags).toContain(' title>')
  })

  it('preserves Vite string attributes in the client DOM', () => {
    const dom = useDom()
    const head = createClientHeadWithContext({ document: dom.window.document })

    head.push(htmlTagsToHead([
      { tag: 'script', attrs: { nonce: 'true', title: '' }, children: 'window.vite = true' },
    ]))
    renderDOMHead(head, { document: dom.window.document })

    const script = dom.window.document.head.querySelector('script')
    expect(script?.getAttribute('nonce')).toBe('true')
    expect(script?.getAttribute('title')).toBe('')
  })

  it('skips unknown tag names without throwing', () => {
    expect(() => htmlTagsToHead([
      { tag: 'div', attrs: { id: 'root' } },
    ])).not.toThrow()

    const result = htmlTagsToHead([
      { tag: 'div', attrs: { id: 'root' } },
      { tag: 'meta', attrs: { name: 'generator', content: 'vite' }, injectTo: 'head' },
    ])
    expect(result).toMatchObject({ meta: [{ name: 'generator', content: 'vite' }] })
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

  it('keeps nested children raw and omits void-tag closing tags', () => {
    const result = htmlTagsToHead([
      {
        tag: 'style',
        injectTo: 'head',
        children: [
          { tag: 'style', children: 'body { color: <unsafe>; }' },
          { tag: 'link', attrs: { rel: 'stylesheet', href: '/app.css' } },
        ],
      },
    ])
    const html = result.style?.[0]?.innerHTML as string
    expect(html).toBe('<style>body { color: <unsafe>; }</style><link rel="stylesheet" href="&#x2F;app.css">')
  })

  it('escapes nested attribute values while keeping nested children raw', () => {
    const result = htmlTagsToHead([
      {
        tag: 'script',
        children: [{ tag: 'span', attrs: { 'title': 'a"&b', 'data-copy': 'A &copy; B' }, children: '<raw>' }],
      },
    ])
    expect(result.script?.[0]?.innerHTML).toBe('<span title="a&quot;&amp;b" data-copy="A &amp;copy; B"><raw></span>')
  })

  it('keeps top-level string attributes raw until SSR serialization', () => {
    const result = htmlTagsToHead([
      { tag: 'meta', attrs: { content: 'A &copy; B' } },
    ])
    expect(result.meta?.[0]?.content).toBe('A &copy; B')

    const head = createServerHeadWithContext()
    head.push(result)
    expect(renderSSRHead(head).headTags).toContain('content="A &amp;copy; B"')
  })

  it('keeps raw attribute values in the client DOM', () => {
    const dom = useDom()
    const head = createClientHeadWithContext({ document: dom.window.document })
    head.push(htmlTagsToHead([
      { tag: 'meta', attrs: { name: 'description', content: 'A &copy; B' } },
    ]))

    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.head.querySelector('meta')?.getAttribute('content')).toBe('A &copy; B')
  })

  it('keeps the first base href and target across multiple descriptors', () => {
    const result = htmlTagsToHead([
      { tag: 'base', attrs: { href: '/first/' } },
      { tag: 'base', attrs: { target: '_self' } },
      { tag: 'base', attrs: { href: '/second/', target: '_blank' } },
    ])
    expect(result.base).toMatchObject({ href: '/first/', target: '_self' })
  })

  it('keeps Vite control-named attrs inert in rendered HTML', () => {
    const head = createServerHeadWithContext()
    head.push(htmlTagsToHead([
      {
        tag: 'script',
        attrs: {
          key: 'vite-key',
          tagPosition: 'bodyClose',
          tagPriority: 'critical',
          tagDuplicateStrategy: 'replace',
          innerHTML: 'attribute-value',
          textContent: 'text-attribute',
          processTemplateParams: 'false',
          src: '/vite.js',
        },
        children: 'window.vite = true',
        injectTo: 'head',
      },
      {
        tag: 'script',
        attrs: { key: 'vite-key', src: '/other.js' },
        children: 'window.other = true',
        injectTo: 'head',
      },
    ]))

    const { headTags, bodyTags } = renderSSRHead(head)
    expect(headTags).toContain('key="vite-key"')
    expect(headTags).toContain('tagposition="bodyClose"')
    expect(headTags).toContain('tagpriority="critical"')
    expect(headTags).toContain('tagduplicatestrategy="replace"')
    expect(headTags).toContain('innerhtml="attribute-value"')
    expect(headTags).toContain('textcontent="text-attribute"')
    expect(headTags).toContain('processtemplateparams="false"')
    expect(headTags).toContain('window.vite = true')
    expect(headTags).toContain('window.other = true')
    expect(bodyTags).toBe('')
  })

  it('keeps Vite style and class attrs raw during SSR', () => {
    const head = createServerHeadWithContext()
    const style = 'background-image:url(data:image/svg+xml;utf8,<svg></svg>);color:red'
    const className = 'vite  vite module'

    head.push(htmlTagsToHead([
      {
        tag: 'script',
        attrs: { style, class: className },
        children: 'window.vite = true',
      },
    ]))

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain(`style="${style}"`)
    expect(headTags).toContain('class="vite  vite module"')
  })

  it('keeps Vite style and class attrs raw in the client DOM', () => {
    const dom = useDom()
    const head = createClientHeadWithContext({ document: dom.window.document })
    const style = 'background-image:url(data:image/svg+xml;utf8,<svg></svg>);color:red'
    const className = 'vite  vite module'

    head.push(htmlTagsToHead([
      {
        tag: 'script',
        attrs: { style, class: className },
        children: 'window.vite = true',
      },
    ]))
    renderDOMHead(head, { document: dom.window.document })

    const script = dom.window.document.head.querySelector('script')
    expect(script?.getAttribute('style')).toBe(style)
    expect(script?.getAttribute('class')).toBe(className)
  })

  it('tokenizes raw Vite classes with HTML ASCII whitespace', () => {
    const dom = useDom()
    const head = createClientHeadWithContext({ document: dom.window.document })

    head.push(htmlTagsToHead([
      {
        tag: 'script',
        attrs: { class: 'vite\tmodule\npreload\fready\ractive final\u00A0preserved' },
      },
    ]))

    expect(() => renderDOMHead(head, { document: dom.window.document })).not.toThrow()
    expect([...dom.window.document.head.querySelector('script')!.classList]).toEqual([
      'vite',
      'module',
      'preload',
      'ready',
      'active',
      'final\u00A0preserved',
    ])
  })

  it('removes every CSS property owned by a raw Vite style', () => {
    const dom = useDom()
    const head = createClientHeadWithContext({ document: dom.window.document })
    const entry = head.push(htmlTagsToHead([
      {
        tag: 'script',
        attrs: {
          id: 'vite-stable',
          style: '/*vite;comment*/color:red;--quoted:"a;b";background-image:url("data:image/svg+xml;utf8,<svg></svg>")',
        },
      },
    ]))

    renderDOMHead(head, { document: dom.window.document })
    const script = dom.window.document.head.querySelector('script')!
    expect(script.style.getPropertyValue('color')).toBe('red')
    expect(script.style.getPropertyValue('--quoted')).toBe('"a;b"')
    expect(script.style.getPropertyValue('background-image')).toContain('data:image/svg+xml;utf8')

    entry.patch(htmlTagsToHead([
      { tag: 'script', attrs: { id: 'vite-stable' } },
    ]))
    renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.head.querySelector('script')).toBe(script)
    expect(script.hasAttribute('style')).toBe(false)
    expect(script.style.length).toBe(0)
  })

  it('updates a stable element from raw Vite class and style attrs to structured attrs', () => {
    const dom = useDom()
    const head = createClientHeadWithContext({ document: dom.window.document })
    const entry = head.push(htmlTagsToHead([
      {
        tag: 'script',
        attrs: { id: 'vite-stable', class: 'shared raw', style: 'color:red;display:block' },
      },
    ]))
    renderDOMHead(head, { document: dom.window.document })
    const script = dom.window.document.head.querySelector('script')!

    entry.patch({
      script: [{
        id: 'vite-stable',
        class: { shared: true, structured: true },
        style: { 'color': 'blue', 'background-color': 'black' },
      }],
    } as unknown as ResolvableHead)
    renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.head.querySelector('script')).toBe(script)
    expect(script.getAttribute('class')).toBe('shared structured')
    expect(script.style.getPropertyValue('color')).toBe('blue')
    expect(script.style.getPropertyValue('background-color')).toBe('black')
    expect(script.style.getPropertyValue('display')).toBe('')
  })

  it('updates a stable element from structured attrs to raw Vite class and style attrs', () => {
    const dom = useDom()
    const head = createClientHeadWithContext({ document: dom.window.document })
    const entry = head.push({
      script: [{
        id: 'vite-stable',
        class: { shared: true, structured: true },
        style: { 'color': 'red', 'background-color': 'black' },
      }],
    } as unknown as ResolvableHead)
    renderDOMHead(head, { document: dom.window.document })
    const script = dom.window.document.head.querySelector('script')!

    entry.patch(htmlTagsToHead([
      {
        tag: 'script',
        attrs: { id: 'vite-stable', class: 'shared raw', style: 'color:blue;display:block' },
      },
    ]))
    renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.head.querySelector('script')).toBe(script)
    expect(script.getAttribute('class')).toBe('shared raw')
    expect(script.getAttribute('style')).toBe('color:blue;display:block')
  })

  it('adopts a server-rendered Vite script with raw class and style attrs', () => {
    const ssrHead = createServerHeadWithContext()
    const input = htmlTagsToHead([
      {
        tag: 'script',
        attrs: { src: '/vite.js', class: 'vite module', style: 'color:red;display:block' },
      },
    ])
    ssrHead.push(input)
    const dom = useDom(renderSSRHead(ssrHead))
    const serverScript = dom.window.document.head.querySelector('script')!
    const clientHead = createClientHeadWithContext({ document: dom.window.document })

    clientHead.push(input)
    renderDOMHead(clientHead, { document: dom.window.document })

    expect(dom.window.document.head.querySelectorAll('script[src="/vite.js"]')).toHaveLength(1)
    expect(dom.window.document.head.querySelector('script')).toBe(serverScript)
  })

  it('adopts a server-rendered Vite script with a bare data boolean', () => {
    const input = htmlTagsToHead([
      { tag: 'script', attrs: { 'src': '/vite.js', 'data-enabled': true } },
    ])
    const ssrHead = createServerHeadWithContext()
    ssrHead.push(input)
    const dom = useDom(renderSSRHead(ssrHead))
    const serverScript = dom.window.document.head.querySelector('script')!
    const clientHead = createClientHeadWithContext({ document: dom.window.document })

    clientHead.push(input)
    renderDOMHead(clientHead, { document: dom.window.document })

    expect(dom.window.document.head.querySelectorAll('script[src="/vite.js"]')).toHaveLength(1)
    expect(dom.window.document.head.querySelector('script')).toBe(serverScript)
  })

  it('keeps distinct raw styles with semicolons inside data URLs', () => {
    const head = createServerHeadWithContext()

    head.push(htmlTagsToHead([
      { tag: 'script', attrs: { style: 'background-image:url("data:image/svg+xml;utf8,<svg id=a></svg>");color:red' } },
      { tag: 'script', attrs: { style: 'background-image:url("data:image/svg+xml;utf8,<svg id=b></svg>");color:red' } },
    ]))

    const { headTags } = renderSSRHead(head)
    expect(headTags.match(/<script/g)).toHaveLength(2)
    expect(headTags).toContain('id=a')
    expect(headTags).toContain('id=b')
  })

  it('preserves external class and style state on an adopted structured element', () => {
    const dom = useDom({
      headTags: '<script id="stable" class="external" style="--external:keep"></script>',
    })
    const script = dom.window.document.head.querySelector('script')!
    const head = createClientHeadWithContext({ document: dom.window.document })
    const entry = head.push({
      script: [{
        id: 'stable',
        class: { owned: true },
        style: { color: 'red' },
      }],
    } as unknown as ResolvableHead)

    renderDOMHead(head, { document: dom.window.document })
    expect(script.classList.contains('external')).toBe(true)
    expect(script.classList.contains('owned')).toBe(true)
    expect(script.style.getPropertyValue('--external')).toBe('keep')
    expect(script.style.getPropertyValue('color')).toBe('red')

    entry.patch({
      script: [{
        id: 'stable',
        class: { updated: true },
        style: { background: 'black' },
      }],
    } as unknown as ResolvableHead)
    renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.head.querySelector('script')).toBe(script)
    expect(script.classList.contains('external')).toBe(true)
    expect(script.classList.contains('owned')).toBe(false)
    expect(script.classList.contains('updated')).toBe(true)
    expect(script.style.getPropertyValue('--external')).toBe('keep')
    expect(script.style.getPropertyValue('color')).toBe('')
    expect(script.style.getPropertyValue('background')).toBe('black')
  })

  it('keeps Vite data boolean attrs bare without changing Unhead semantics', () => {
    const viteSsrHead = createServerHeadWithContext()
    viteSsrHead.push(htmlTagsToHead([
      { tag: 'meta', attrs: { 'name': 'vite', 'content': 'enabled', 'data-enabled': true } },
    ]))
    expect(renderSSRHead(viteSsrHead).headTags).toContain('data-enabled>')

    const unheadSsrHead = createServerHeadWithContext()
    unheadSsrHead.push({ meta: [{ 'name': 'unhead', 'content': 'enabled', 'data-enabled': true }] })
    expect(renderSSRHead(unheadSsrHead).headTags).toContain('data-enabled="true"')

    const dom = useDom()
    const clientHead = createClientHeadWithContext({ document: dom.window.document })
    clientHead.push(htmlTagsToHead([
      { tag: 'meta', attrs: { 'name': 'vite', 'content': 'enabled', 'data-enabled': true } },
    ]))
    clientHead.push({ meta: [{ 'name': 'unhead', 'content': 'enabled', 'data-enabled': true }] })
    renderDOMHead(clientHead, { document: dom.window.document })

    expect(dom.window.document.head.querySelector('meta[name="vite"]')?.getAttribute('data-enabled')).toBe('')
    expect(dom.window.document.head.querySelector('meta[name="unhead"]')?.getAttribute('data-enabled')).toBe('true')
  })

  it('renders Vite marker meta tags without content', () => {
    const head = createServerHeadWithContext()
    head.push(htmlTagsToHead([
      { tag: 'meta', attrs: { name: 'vite-marker' } },
      { tag: 'meta', attrs: { name: 'vite-empty', content: '' } },
    ]))
    head.push({ meta: [{ name: 'unhead-marker' }] } as any)

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('<meta name="vite-marker">')
    expect(headTags).toContain('<meta name="vite-empty" content="">')
    expect(headTags).not.toContain('unhead-marker')
  })

  it('skips title descriptors', () => {
    const result = htmlTagsToHead([
      { tag: 'title', children: 'Vite &amp; Unhead' },
      { tag: 'meta', attrs: { name: 'generator', content: 'vite' } },
    ])
    expect(result).not.toHaveProperty('title')
    expect(result.meta).toHaveLength(1)
  })

  it('keeps the first base values in Vite render order', () => {
    const result = htmlTagsToHead([
      { tag: 'base', attrs: { href: '/head/', target: '_self' }, injectTo: 'head' },
      { tag: 'base', attrs: { href: '/prepend/', target: '_blank' }, injectTo: 'head-prepend' },
    ])
    expect(result.base).toMatchObject({ href: '/prepend/', target: '_blank' })
  })

  it('keeps base href and target case-insensitively', () => {
    const result = htmlTagsToHead([
      { tag: 'base', attrs: { HREF: '/first/', TARGET: '_self' } },
      { tag: 'base', attrs: { href: '/second/', target: '_blank' } },
    ])
    expect(result.base).toMatchObject({ href: '/first/', target: '_self' })
  })

  it('keeps only representable base placement metadata', () => {
    const prepend = htmlTagsToHead([
      { tag: 'base', attrs: { href: '/prepend/' }, injectTo: 'head-prepend' },
    ])
    const body = htmlTagsToHead([
      { tag: 'base', attrs: { href: '/body/' }, injectTo: 'body' },
    ])

    expect(prepend.base).toMatchObject({ tagPriority: 'high', href: '/prepend/' })
    expect(body.base).toMatchObject({ href: '/body/' })
  })
})
