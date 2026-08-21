// @vitest-environment jsdom
/**
 * Candidate 3: @vue/runtime-dom as the client head renderer.
 * Each test pins one contract question: SSR adoption, never-reorder,
 * htmlAttrs/bodyAttrs, script patch semantics, teleport hydration shape.
 */
import { describe, expect, it, vi } from 'vitest'
import { createApp, createSSRApp, createVNode, Fragment, h, render, Teleport } from 'vue'
import { createHead as createV4Client } from '../../../packages/unhead/src/v4/client'
import { createHead as createV4Server } from '../../../packages/unhead/src/v4/server'
import { createVueDomRenderer } from './proto/vnode-client'

function resetHead(html = '') {
  document.head.innerHTML = html
  document.body.innerHTML = '<div id="app"><h1>hi</h1></div>'
  document.documentElement.removeAttribute('lang')
  document.body.className = ''
  // vue's render()/mount() pin state on the container; drop it between tests
  delete (document.head as any)._vnode
  delete (document.head as any).__vue_app__
}

function quietVue() {
  const logs: string[] = []
  const push = (...args: any[]) => logs.push(args.map(String).join(' '))
  const w = vi.spyOn(console, 'warn').mockImplementation(push)
  const e = vi.spyOn(console, 'error').mockImplementation(push)
  return {
    logs,
    restore: () => {
      w.mockRestore()
      e.mockRestore()
    },
  }
}

const headTags = () => [...document.head.children].map(el => el.outerHTML)

describe('render() into document.head', () => {
  it('mounts and patches head element tags', () => {
    resetHead()
    const meta = (c: string) => h('meta', { key: 'meta:description', name: 'description', content: c })
    render(createVNode(Fragment, null, [meta('a')]), document.head as any)
    expect(headTags()).toEqual(['<meta name="description" content="a">'])
    render(createVNode(Fragment, null, [meta('b')]), document.head as any)
    expect(headTags()).toEqual(['<meta name="description" content="b">'])
    render(null, document.head as any)
  })

  it('does NOT adopt existing SSR elements: render appends duplicates after them', () => {
    resetHead('<meta name="description" content="ssr">')
    render(createVNode(Fragment, null, [
      h('meta', { key: 'meta:description', name: 'description', content: 'ssr' }),
    ]), document.head as any)
    // two description metas now; render() has no adoption concept at all
    expect(headTags()).toEqual([
      '<meta name="description" content="ssr">',
      '<meta name="description" content="ssr">',
    ])
    render(null, document.head as any)
  })

  it('violates never-reorder: keyed diff physically moves existing elements', () => {
    resetHead()
    render(createVNode(Fragment, null, [
      h('link', { key: 'a', rel: 'stylesheet', href: '/a.css' }),
      h('link', { key: 'b', rel: 'stylesheet', href: '/b.css' }),
    ]), document.head as any)
    const [elA, elB] = [...document.head.children]
    const moves = vi.spyOn(document.head, 'insertBefore')
    render(createVNode(Fragment, null, [
      h('link', { key: 'b', rel: 'stylesheet', href: '/b.css' }),
      h('link', { key: 'a', rel: 'stylesheet', href: '/a.css' }),
    ]), document.head as any)
    expect(moves).toHaveBeenCalled() // live stylesheet <link> nodes moved
    expect([...document.head.children]).toEqual([elB, elA])
    moves.mockRestore()
    render(null, document.head as any)
    // v4 contract (V4_DESIGN.md 5.1): existing elements are never moved;
    // resolve-order changes must not thrash a live document
  })

  it('script patch keeps the same element when the key is stable, so a src swap never re-executes', () => {
    resetHead()
    render(createVNode(Fragment, null, [h('script', { key: 's', src: '/a.js' })]), document.head as any)
    const el1 = document.head.querySelector('script')
    render(createVNode(Fragment, null, [h('script', { key: 's', src: '/b.js' })]), document.head as any)
    const el2 = document.head.querySelector('script')
    // same node, attr patched in place: browsers only execute a script on
    // first insertion, so the vue path silently loads nothing for /b.js
    expect(el2).toBe(el1)
    expect(el2!.getAttribute('src')).toBe('/b.js')
    render(null, document.head as any)

    // v4 client: src is part of the tag hash, so a src change re-keys to a
    // fresh element (real re-execution)
    resetHead()
    const head = createV4Client({ document })
    const e = head.push({ script: [{ src: '/a.js' }] })
    head.render()
    const v4el1 = document.head.querySelector('script')
    e.patch({ script: [{ src: '/b.js' }] })
    head.render()
    const v4el2 = document.head.querySelector('script')
    expect(v4el2).not.toBe(v4el1)
  })

  it('htmlAttrs/bodyAttrs are not elements: the vue path still hand-rolls the same attr code v4 already has', () => {
    resetHead()
    const r = createVueDomRenderer()
    const head = createV4Server({ disableDefaults: true })
    head.push({ htmlAttrs: { lang: 'fr' }, bodyAttrs: { class: 'dark' } })
    r.apply(head.resolve(), document)
    expect(document.documentElement.getAttribute('lang')).toBe('fr')
    expect(document.body.classList.contains('dark')).toBe(true)
    r.dispose(document)
  })
})

describe('hydration paths', () => {
  const vnodes = () => [
    h('meta', { key: 'c', charset: 'utf-8' }),
    h('title', { key: 't' }, 'A'),
  ]

  it('plain SSR head markup CANNOT hydrate: the root fragment expects <!--[--> anchors and mismatch recovery corrupts the head', () => {
    resetHead('<meta charset="utf-8"><title>A</title>')
    const { logs, restore } = quietVue()
    const app = createSSRApp({ render: () => h(Fragment, null, vnodes()) })
    app.mount(document.head as any)
    restore()
    // vue hydrates the fragment against comment anchors its own SSR emits;
    // unhead's plain tags mismatch immediately
    expect(logs.join('\n')).toContain('Hydration node mismatch')
    // recovery re-mounts the fragment alongside the SSR nodes: duplicate title
    expect(document.head.querySelectorAll('title').length).toBe(2)
    app.unmount()
  })

  it('a foreign tag (vite css, browser extension) sits inside the mismatch too and the remount interleaves around it', () => {
    resetHead('<meta charset="utf-8"><style data-vite-dev-id="x">.a{}</style><title>A</title>')
    const { logs, restore } = quietVue()
    const app = createSSRApp({ render: () => h(Fragment, null, vnodes()) })
    app.mount(document.head as any)
    restore()
    expect(logs.join('\n')).toContain('Hydration node mismatch')
    expect(document.head.querySelectorAll('title').length).toBe(2)
    app.unmount()
  })

  it('iF unhead SSR emitted vue fragment anchors, exact-order hydration adopts cleanly', () => {
    // the one shape that works: <!--[--> tags <!--]--> with vnode order equal
    // to emitted order, and no foreign tag inside the anchor range
    resetHead('<!--[--><meta charset="utf-8"><title>A</title><!--]-->')
    const before = document.head.querySelector('meta')
    const { logs, restore } = quietVue()
    const app = createSSRApp({ render: () => h(Fragment, null, vnodes()) })
    app.mount(document.head as any)
    restore()
    expect(logs.join('\n')).toBe('')
    expect(document.head.querySelector('meta')).toBe(before) // adopted, not recreated
    app.unmount()
  })

  it('anchored adoption still breaks the moment a foreign tag lands inside the anchor range', () => {
    // extensions/analytics append to head end; with <!--]--> last, that is
    // inside the fragment range and the next hydration mismatches
    resetHead('<!--[--><meta charset="utf-8"><style injected-by-extension>.x{}</style><title>A</title><!--]-->')
    const { logs, restore } = quietVue()
    const app = createSSRApp({ render: () => h(Fragment, null, vnodes()) })
    app.mount(document.head as any)
    restore()
    expect(logs.join('\n')).toContain('Hydration node mismatch')
    app.unmount()
  })

  it('teleport to head works for CSR but its SSR shape needs anchors + buffers unhead does not emit', () => {
    resetHead()
    const app = createApp({
      render: () => h(Teleport, { to: document.head }, [
        h('meta', { key: 'm', name: 'x', content: 'y' }),
      ]),
    })
    const host = document.createElement('div')
    document.body.appendChild(host)
    app.mount(host)
    expect(document.head.querySelector('meta[name=x]')).toBeTruthy()
    // hydrating a teleport requires `<!--teleport start-->` anchors in the
    // APP container plus the head markup registered in __teleportBuffers;
    // unhead SSR emits plain tags, so the teleport route cannot hydrate
    // against unhead SSR output at all
    app.unmount()
    expect(document.head.querySelector('meta[name=x]')).toBeNull()
  })
})
