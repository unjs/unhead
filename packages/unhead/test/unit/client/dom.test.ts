import { renderDOMHead } from '@unhead/dom'
import { describe, expect, it } from 'vitest'
import { useHead } from '../../../src'
import { basicSchema, createServerHeadWithContext, useDelayedSerializedDom, useDom, useDOMHead } from '../../util'

describe('dom', () => {
  it('renders numeric zero meta content', () => {
    const head = useDOMHead()

    head.push({
      meta: [{ name: 'numeric-zero', content: 0 }],
    })

    expect(head.resolvedOptions.document?.querySelector('meta[name="numeric-zero"]')?.getAttribute('content')).toBe('0')
  })

  it('renders a numeric zero title', () => {
    const head = useDOMHead()

    head.push({
      title: 0,
    })

    expect(head.resolvedOptions.document?.title).toBe('0')
  })

  it('renders a fresh server head into an explicit document once', () => {
    const document = useDom().window.document
    const head = createServerHeadWithContext()
    head.push({
      title: 'Server title',
      meta: [{ name: 'description', content: 'Server description' }],
    })

    expect(renderDOMHead(head, { document })).toBe(true)
    expect(document.title).toBe('Server title')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Server description')
    expect(renderDOMHead(head, { document })).toBe(false)
  })

  it('basic', async () => {
    const head = useDOMHead()

    useHead(head, basicSchema)

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang="en" dir="ltr"><head>

      <script src="https://cdn.example.com/script.js"></script><meta charset="utf-8"><link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico"></head>
      <body class="dark">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('boolean attributes respected', async () => {
    const head = useDOMHead()

    head.push({
      script: [
        {
          defer: true,
          async: false,
          src: 'https://cdn.example.com/script.js',
        },
      ],
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <script defer="" src="https://cdn.example.com/script.js"></script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('guards reentrant beforeRender renders and keeps mutations', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    let beforeCalls = 0

    head.hooks.hook('dom:beforeRender', () => {
      beforeCalls++
      if (beforeCalls === 1) {
        head.push({ meta: [{ name: 'before-render', content: 'included' }] })
        expect(renderDOMHead(head, { document })).toBe(false)
      }
    })

    head.push({ title: 'Initial' })

    expect(beforeCalls).toBe(1)
    expect(document.title).toBe('Initial')
    expect(document.querySelector('meta[name="before-render"]')?.getAttribute('content')).toBe('included')
  })

  it('renders mutations made by dom:rendered in a follow-up pass', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    let renders = 0

    head.hooks.hook('dom:rendered', () => {
      renders++
      if (renders === 1)
        head.push({ meta: [{ name: 'description', content: 'from-hook' }] })
    })

    head.push({ title: 'Initial' })

    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('from-hook')
    expect(renders).toBe(2)
    expect(head.dirty).toBe(false)
  })

  it('clears dropped attributes and content when a keyed element is reused', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!

    const entry = head.push({
      script: [{ 'key': 's1', 'id': 'reused-script', 'innerHTML': 'console.log(1)', 'data-foo': 'bar' }],
    })

    const el = document.querySelector('script#reused-script')!
    expect(el).not.toBeNull()
    expect(el.innerHTML).toBe('console.log(1)')
    expect(el.getAttribute('data-foo')).toBe('bar')

    // same key keeps the dedupe id stable, so the element is reused rather than recreated;
    // innerHTML and data-foo are dropped and must be cleared. Cast: the strict script type makes
    // src/innerHTML mutually exclusive, so a content-less reused inline script isn't expressible.
    entry.patch({ script: [{ key: 's1', id: 'reused-script' }] } as any)

    const after = document.querySelector('script#reused-script')!
    expect(after).toBe(el)
    expect(after.innerHTML).toBe('')
    expect(after.getAttribute('data-foo')).toBeNull()
  })

  it('switches a reused element between innerHTML and textContent without leaking stale content', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!

    const entry = head.push({ style: [{ key: 's1', id: 'sw', innerHTML: '.a{color:red}' }] })
    const el = document.querySelector('style#sw')!
    expect(el.innerHTML).toBe('.a{color:red}')

    // same key -> element reused. Switch html -> text: the dropped html cleanup must not
    // clobber the freshly set textContent, and the new text must fully replace the old content.
    entry.patch({ style: [{ key: 's1', id: 'sw', textContent: '.b{color:blue}' }] } as any)
    expect(document.querySelector('style#sw')).toBe(el)
    expect(el.textContent).toBe('.b{color:blue}')
    expect(el.innerHTML).toBe('.b{color:blue}')

    // switch back text -> html
    entry.patch({ style: [{ key: 's1', id: 'sw', innerHTML: '.c{color:green}' }] } as any)
    expect(el.innerHTML).toBe('.c{color:green}')
  })
})

// The renderer reconciles by reusing the element behind a stable dedupe identity. When a
// reused element DROPS a value across renders (rather than updating it), the stale value must
// be cleared. The common patterns below already worked; the keyed-drop cases are what this
// fixes — without a `key`, dropping a value usually changes the dedupe identity (fresh element,
// no stale state), but a `key` forces reuse, so the drop has to be cleaned up explicitly.
describe('reused element drop reconciliation', () => {
  it('reconciles identity attributes on an adopted meta tag', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    document.head.innerHTML = '<meta name="og:title" content="Default" data-origin="external">'
    const adopted = document.head.querySelector('meta')!

    head.push({ meta: [{ property: 'og:title', content: 'Page' }] })

    const meta = document.head.querySelector('meta[property="og:title"]')!
    expect(meta).toBe(adopted)
    expect(meta.getAttribute('name')).toBeNull()
    expect(meta.getAttribute('content')).toBe('Page')
    expect(meta.getAttribute('data-origin')).toBeNull()
  })

  it.each([
    ['base target', '<base href="/" target="_blank">', { base: { href: '/' } }, 'base', 'target'],
    ['link media', '<link rel="stylesheet" href="/app.css" media="print">', { link: [{ rel: 'stylesheet', href: '/app.css' }] }, 'link', 'media'],
    ['script defer', '<script data-hid="app" src="/app.js" defer></script>', { script: [{ key: 'app', src: '/app.js' }] }, 'script', 'defer'],
    ['style nonce', '<style nonce="old">body{}</style>', { style: [{ textContent: 'body{}' }] }, 'style', 'nonce'],
    ['meta content', '<meta http-equiv="refresh" content="5">', { meta: [{ 'http-equiv': 'refresh' }] }, 'meta', 'content'],
  ] as const)('removes stale %s from an adopted tag', (_, html, input, selector, attr) => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    document.head.innerHTML = html
    const adopted = document.head.querySelector(selector)!

    head.push(input as any)

    expect(document.head.querySelector(selector)).toBe(adopted)
    expect(adopted.getAttribute(attr)).toBeNull()
  })

  it('reconciles classes, styles, and attributes on adopted document elements', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    document.documentElement.setAttribute('class', 'server shared')
    document.documentElement.setAttribute('style', 'color: red; background: blue')
    document.documentElement.setAttribute('data-server', 'html')
    document.body.setAttribute('class', 'server shared')
    document.body.setAttribute('style', 'color: red; background: blue')
    document.body.setAttribute('data-server', 'body')

    head.push({
      htmlAttrs: {
        class: 'client shared',
        style: { color: 'green' },
      },
      bodyAttrs: {
        class: 'client shared',
        style: { color: 'green' },
      },
    })

    expect(document.documentElement.className).toBe('shared client')
    expect(document.documentElement.style.cssText).toBe('color: green;')
    expect(document.documentElement.getAttribute('data-server')).toBeNull()
    expect(document.body.className).toBe('shared client')
    expect(document.body.style.cssText).toBe('color: green;')
    expect(document.body.getAttribute('data-server')).toBeNull()
  })

  it('clears content omitted from an adopted keyed tag', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    document.head.innerHTML = '<script data-hid="payload" type="application/json">{"stale":true}</script>'
    const adopted = document.head.querySelector('script')!

    head.push({ script: [{ key: 'payload', type: 'application/json' }] } as any)

    expect(document.head.querySelector('script')).toBe(adopted)
    expect(adopted.textContent).toBe('')
  })

  it('preserves unmatched external elements', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    document.head.innerHTML = '<meta name="external" content="keep" data-origin="external">'
    const external = document.head.querySelector('meta')!

    head.push({ title: 'Page' })

    expect(document.head.querySelector('meta')).toBe(external)
    expect(external.getAttribute('content')).toBe('keep')
    expect(external.getAttribute('data-origin')).toBe('external')
  })

  it('preserves attributes added after adoption', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    document.head.innerHTML = '<meta name="description" content="managed">'
    const entry = head.push({
      bodyAttrs: {
        class: 'managed',
        style: { color: 'green' },
      },
      meta: [{ name: 'description', content: 'managed' }],
    })
    const meta = document.head.querySelector('meta')!
    meta.setAttribute('data-external', 'keep')
    document.body.classList.add('external')
    document.body.style.setProperty('background', 'blue')

    entry.patch({
      bodyAttrs: {
        class: 'managed',
        style: { color: 'green' },
      },
      meta: [{ name: 'description', content: 'managed' }],
    })

    expect(meta.getAttribute('data-external')).toBe('keep')
    expect(document.body.classList.contains('external')).toBe(true)
    expect(document.body.style.getPropertyValue('background')).toBe('blue')
  })

  it('updates content in place (no stale value)', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    const entry = head.push({ meta: [{ name: 'description', content: 'Page A' }] })
    entry.patch({ meta: [{ name: 'description', content: 'Page B' }] })
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Page B')
  })

  it('removes a tag that is dropped entirely', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    const entry = head.push({ meta: [{ name: 'robots', content: 'noindex' }] })
    entry.patch({})
    expect(document.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('clears a dropped attribute on an unkeyed reused tag', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    const entry = head.push({ meta: [{ property: 'og:image', content: '/old.png' }] })
    entry.patch({ meta: [{ property: 'og:image' }] } as any)
    // no key: a content-less meta is sanitized out entirely, so the stale value can't linger
    const m = document.querySelector('meta[property="og:image"]')
    expect(m?.getAttribute('content') ?? null).toBeNull()
  })

  it('clears dropped inline content on a keyed reused tag (stale structured data)', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    const entry = head.push({ script: [{ key: 'ld', type: 'application/ld+json', innerHTML: '{"@type":"Product"}' }] })
    expect(document.querySelector('script[type="application/ld+json"]')?.innerHTML).toBe('{"@type":"Product"}')
    entry.patch({ script: [{ key: 'ld', type: 'application/ld+json' }] } as any)
    const el = document.querySelector('script[type="application/ld+json"]')
    expect(el == null || el.innerHTML === '').toBe(true)
  })

  it('clears a dropped data-* attribute on a keyed reused tag', () => {
    const head = useDOMHead()
    const document = head.resolvedOptions.document!
    const entry = head.push({ meta: [{ 'key': 'x', 'name': 'theme-color', 'content': '#fff', 'data-flag': 'on' }] })
    entry.patch({ meta: [{ key: 'x', name: 'theme-color', content: '#fff' }] })
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('data-flag')).toBeNull()
  })
})
