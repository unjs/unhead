import type { ResolvableHead } from '../../../src/types'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHead as createClientHead } from '../../../src/client'
import { createHead as createLazyHead } from '../../../src/lazy'
import { createHead as createServerHead, renderSSRHead } from '../../../src/server'

function ssrDom(...inputs: ResolvableHead[]) {
  const head = createServerHead({ disableDefaults: true })
  inputs.forEach(input => head.push(input))
  const { headTags, htmlAttrs, bodyAttrs, bodyTags, bodyTagsOpen } = renderSSRHead(head)
  return new JSDOM(`<!DOCTYPE html><html${htmlAttrs}><head>${headTags}</head><body${bodyAttrs}>${bodyTagsOpen}<div>app</div>${bodyTags}</body></html>`)
}

const settle = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms))

const titled = { title: 'Server', meta: [{ name: 'description', content: 'desc' }] }

function pausableHead(dom: JSDOM) {
  let paused = true
  const head = createLazyHead({ document: dom.window.document })
  head.hooks.hook('dom:beforeRender', (ctx) => {
    ctx.shouldRender = !paused
  })
  return {
    head,
    setPaused: (next: boolean) => {
      paused = next
    },
  }
}

// the production path: dev warnings have their own tests
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production')
  return () => vi.unstubAllEnvs()
})

describe('lazy head createHead', () => {
  it('stores entries and does not touch the document before load', async () => {
    const dom = ssrDom(titled)
    const before = dom.serialize()
    const { head } = pausableHead(dom)
    head.push({ title: 'Client only' })
    await settle()
    expect(dom.serialize()).toBe(before)
    expect([...head.entries.values()].map(e => e.input)).toEqual([{ title: 'Client only' }])
  })

  it('loads nothing when hydration ends with no change', async () => {
    const dom = ssrDom(titled)
    const before = dom.serialize()
    const head = createLazyHead({ document: dom.window.document })
    const load = vi.spyOn(head, 'load')
    head.push(titled)
    head.render()
    await settle(300)
    expect(load).not.toHaveBeenCalled()
    expect(dom.serialize()).toBe(before)
  })

  it('reconciles entries with the server document on load', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    head.push(titled)
    head.push({ meta: [{ name: 'client', content: 'yes' }] })
    const doc = dom.window.document
    await head.load()
    await vi.waitFor(() => expect(doc.querySelector('meta[name="client"]')?.getAttribute('content')).toBe('yes'))
    expect(doc.title).toBe('Server')
    expect(doc.querySelectorAll('meta[name="description"]')).toHaveLength(1)
  })

  it.each([
    ['titles and meta', { title: 'T', titleTemplate: '%s | Site', meta: [{ name: 'a', content: 'b' }, { property: 'og:image', content: '/1.png' }, { property: 'og:image', content: '/2.png' }] }],
    ['attrs', { htmlAttrs: { lang: 'en', class: 'a b' }, bodyAttrs: { class: 'c', style: 'color:red' } }],
    ['links and scripts', { link: [{ rel: 'canonical', href: '/x' }, { rel: 'stylesheet', href: '/a.css' }], script: [{ src: '/a.js', defer: true }, { type: 'application/ld+json', innerHTML: { a: 1 } }] }],
    ['positions', { script: [{ src: '/open.js', tagPosition: 'bodyOpen' }, { src: '/close.js', tagPosition: 'bodyClose' }] }],
  ] as const)('matches the default client head after load: %s', async (_, input) => {
    const expected = ssrDom(input as ResolvableHead)
    const v3 = createClientHead({ document: expected.window.document })
    v3.push(input as any)
    v3.render()

    const actual = ssrDom(input as ResolvableHead)
    const head = createLazyHead({ document: actual.window.document })
    head.push(input as any)
    await head.load()
    await vi.waitFor(() => expect(actual.serialize()).toBe(expected.serialize()))
  })

  it('blocks change loads while dom:beforeRender pauses rendering', async () => {
    const dom = ssrDom(titled)
    const { head, setPaused } = pausableHead(dom)
    head.push(titled)
    head.render()
    await settle()
    head.push({ title: 'Next' })
    await settle()
    expect(dom.window.document.title).toBe('Server')

    setPaused(false)
    head.render()
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Next'))
  })

  it('blockLoad blocks a change until the next render, with no pause active', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    const entry = head.push(titled)
    head.render()
    head.blockLoad()
    const load = vi.spyOn(head, 'load')
    entry.patch({ title: 'Next' })
    head.push({ meta: [{ name: 'next', content: 'yes' }] })
    await settle()
    expect(load).not.toHaveBeenCalled()
    expect(dom.window.document.title).toBe('Server')

    head.render()
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Next'))
  })

  it('a render after blockLoad with no change loads nothing', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    const load = vi.spyOn(head, 'load')
    head.push(titled)
    head.blockLoad()
    head.render()
    await settle()
    expect(load).not.toHaveBeenCalled()
  })

  it('load runs during a load block when called directly', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    head.blockLoad()
    head.push({ title: 'Direct' })
    expect(await head.load()).toBe(true)
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Direct'))
  })

  it('blockLoad during a load keeps its first render until the next render', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    head.push({ title: 'Client' })
    const loaded = head.load()
    head.blockLoad()
    expect(await loaded).toBe(true)
    head.push({ meta: [{ name: 'held', content: 'yes' }] })
    await settle()
    expect(dom.window.document.title).toBe('Server')
    expect(dom.window.document.querySelector('meta[name="held"]')).toBeNull()

    head.render()
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Client'))
    expect(dom.window.document.querySelector('meta[name="held"]')?.getAttribute('content')).toBe('yes')
    // the release ends the block, so a change renders again
    head.push({ meta: [{ name: 'after', content: 'yes' }] })
    await vi.waitFor(() => expect(dom.window.document.querySelector('meta[name="after"]')).not.toBeNull())
  })

  it('loads at once for a visible change after hydration', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    head.push(titled)
    head.render()
    const load = vi.spyOn(head, 'load')
    head.push({ title: 'After', link: [{ rel: 'stylesheet', href: '/after.css' }] })
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(dom.window.document.title).toBe('After'))
  })

  it('loads at once for a patch during hydration, even while paused', async () => {
    const dom = ssrDom(titled)
    const { head } = pausableHead(dom)
    const load = vi.spyOn(head, 'load')
    const entry = head.push(titled)
    expect(load).not.toHaveBeenCalled()
    entry.patch({ title: 'Patched' })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('loads nothing for a patch with the same input, during or after hydration', async () => {
    const dom = ssrDom(titled)
    const before = dom.serialize()
    const head = createLazyHead({ document: dom.window.document })
    const load = vi.spyOn(head, 'load')
    const entry = head.push({ ...titled, meta: [{ name: 'description', content: 'desc' }] })
    // a reactive input that resolves again, as a route change during hydration does
    entry.patch({ title: 'Server', meta: [{ name: 'description', content: 'desc' }] })
    head.render()
    entry.patch({ title: 'Server', meta: [{ name: 'description', content: 'desc' }] })
    head.render()
    await settle()
    expect(load).not.toHaveBeenCalled()
    expect(dom.serialize()).toBe(before)

    entry.patch({ title: 'Changed', meta: [{ name: 'description', content: 'desc' }, { name: 'theme-color', content: '#000' }] })
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Changed'))
  })

  it('treats a push from an entries:updated hook during hydration as server rendered', async () => {
    const dom = ssrDom(titled, { meta: [{ name: 'nested', content: 'yes' }] })
    let nested = false
    const head = createLazyHead({
      document: dom.window.document,
      hooks: {
        'entries:updated': (h) => {
          if (!nested) {
            nested = true
            h.push({ meta: [{ name: 'nested', content: 'yes' }] })
          }
        },
      },
    })
    const load = vi.spyOn(head, 'load')
    head.push(titled)
    expect(load).not.toHaveBeenCalled()
  })

  it('blocks a change after hydration while paused', async () => {
    const dom = ssrDom(titled)
    const { head, setPaused } = pausableHead(dom)
    setPaused(false)
    const entry = head.push(titled)
    head.render()
    setPaused(true)
    const load = vi.spyOn(head, 'load')
    entry.patch({ title: 'Patched' })
    expect(load).not.toHaveBeenCalled()
  })

  it('removes the server element of an entry disposed before load', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    const entry = head.push(titled)
    head.render()
    head.blockLoad()
    entry.dispose()
    head.render()
    await vi.waitFor(() => expect(dom.window.document.querySelector('meta[name="description"]')).toBeNull())
  })

  it.each([false, true])('removes an SSR stylesheet disposed before hydration ends (render: %s)', async (render) => {
    const input: ResolvableHead = { link: [{ rel: 'stylesheet', href: '/server.css' }] }
    const dom = ssrDom(input)
    const head = createLazyHead({ document: dom.window.document })
    const entry = head.push(input)
    entry.dispose()
    if (render)
      head.render()
    expect(await head.load()).toBe(true)
    await vi.waitFor(() => expect([...dom.window.document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.getAttribute('href'))).toEqual([]))
  })

  it('removes obsolete links patched repeatedly before hydration ends', async () => {
    const input: ResolvableHead = { link: [{ rel: 'prev', href: '/server' }] }
    const dom = ssrDom(input)
    const head = createLazyHead({ document: dom.window.document })
    const entry = head.push(input)
    entry.patch({ link: [{ rel: 'prev', href: '/intermediate' }] })
    entry.patch({ link: [{ rel: 'prev', href: '/client' }] })
    expect(await head.load()).toBe(true)
    await vi.waitFor(() => {
      const links = dom.window.document.querySelectorAll('link[rel="prev"]')
      expect([...links].map(link => link.getAttribute('href'))).toEqual(['/client'])
    })
  })

  it('adopts entries disposed while lazy plugins load during hydration', async () => {
    const input: ResolvableHead = { link: [{ rel: 'stylesheet', href: '/server.css' }] }
    const dom = ssrDom(input)
    const started = Promise.withResolvers<void>()
    const plugins = Promise.withResolvers<[]>()
    const head = createLazyHead({
      document: dom.window.document,
      lazyPlugins: () => {
        started.resolve()
        return plugins.promise
      },
    })
    const loading = head.load()
    await started.promise
    const entry = head.push(input)
    entry.dispose()
    plugins.resolve([])
    expect(await loading).toBe(true)
    await vi.waitFor(() => expect([...dom.window.document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.getAttribute('href'))).toEqual([]))
  })

  it('removes the server element when a patch before load changes its identity', async () => {
    const input: ResolvableHead = { link: [{ rel: 'prev', href: '/a' }] }
    const dom = ssrDom(input)
    const head = createLazyHead({ document: dom.window.document })
    const entry = head.push(input)
    head.render()
    head.blockLoad()
    entry.patch({ link: [{ rel: 'prev', href: '/b' }] })
    head.render()
    await vi.waitFor(() => {
      const links = dom.window.document.querySelectorAll('link[rel="prev"]')
      expect(links).toHaveLength(1)
      expect(links[0].getAttribute('href')).toBe('/b')
    })
  })

  it('keeps an entry a plugin pushes during the adoption render', async () => {
    const dom = ssrDom(titled)
    let pushed = false
    const head = createLazyHead({
      document: dom.window.document,
      plugins: [h => ({
        key: 'pusher',
        hooks: {
          'tags:resolve': () => {
            if (!pushed) {
              pushed = true
              h.push({ meta: [{ name: 'plugin', content: 'yes' }] })
            }
          },
        },
      })],
    })
    const entry = head.push(titled)
    entry.patch({ title: 'Patched' })
    expect(await head.load()).toBe(true)
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Patched'))
    expect(pushed).toBe(true)
    expect(dom.window.document.querySelector('meta[name="plugin"]')?.getAttribute('content')).toBe('yes')
  })

  it('keeps a dispose a plugin makes during the adoption render', async () => {
    const dom = ssrDom(titled)
    let other: { dispose: () => void } | undefined
    const head = createLazyHead({
      document: dom.window.document,
      plugins: [{
        key: 'disposer',
        hooks: {
          'tags:resolve': () => {
            other?.dispose()
            other = undefined
          },
        },
      }],
    })
    const entry = head.push(titled)
    const pushed = head.push({ meta: [{ name: 'other', content: 'yes' }] })
    entry.patch({ title: 'Patched' })
    other = pushed
    expect(await head.load()).toBe(true)
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Patched'))
    expect(dom.window.document.querySelector('meta[name="other"]')?.outerHTML).toBeUndefined()
  })

  it('keeps a dispose a plugin makes during the adoption render of a client only entry', async () => {
    const dom = ssrDom(titled)
    let clientOnly = false
    let other: { dispose: () => void } | undefined
    const head = createLazyHead({
      document: dom.window.document,
      ...{ _isClientOnlyPush: () => clientOnly } as object,
      plugins: [{
        key: 'disposer',
        hooks: {
          'tags:resolve': () => {
            other?.dispose()
            other = undefined
          },
        },
      }],
    })
    const entry = head.push(titled)
    entry.patch({ title: 'Patched' })
    clientOnly = true
    other = head.push({ meta: [{ name: 'client', content: 'yes' }] })
    clientOnly = false
    expect(await head.load()).toBe(true)
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Patched'))
    expect(dom.window.document.querySelector('meta[name="client"]')?.outerHTML).toBeUndefined()
    expect(head.entries.size).toBe(1)
  })

  it('leaves the document to a custom render option during adoption', async () => {
    const dom = ssrDom(titled)
    const render = vi.fn()
    const head = createLazyHead({ document: dom.window.document, render })
    const entry = head.push({ title: 'Client' })
    entry.patch({ title: 'Patched' })
    expect(await head.load()).toBe(true)
    expect(render).toHaveBeenCalledWith(head)
    expect(dom.window.document.title).toBe('Server')
  })

  it('fires dom:rendered once when a load follows a change', async () => {
    const dom = ssrDom(titled)
    const rendered = vi.fn()
    const head = createLazyHead({ document: dom.window.document, hooks: { 'dom:rendered': rendered } })
    const entry = head.push(titled)
    head.render()
    head.blockLoad()
    entry.dispose()
    head.render()
    await vi.waitFor(() => expect(rendered).toHaveBeenCalled())
    await settle(40)
    expect(rendered).toHaveBeenCalledTimes(1)
  })

  it('keeps a wrapper assigned to head.push after load', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    const original = head.push.bind(head)
    const seen: unknown[] = []
    head.push = ((input: any, options: any) => {
      seen.push(input)
      return original(input, options)
    }) as typeof head.push
    await head.load()
    head.push({ title: 'Wrapped' })
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Wrapped'))
    expect(seen).toEqual([{ title: 'Wrapped' }])
  })

  it('runs plugin setup at once and applies its hooks after load', async () => {
    const dom = ssrDom(titled)
    const setup = vi.fn()
    const head = createLazyHead({
      document: dom.window.document,
      plugins: [{
        key: 'upper',
        hooks: {
          'tags:resolve': ({ tags }) => {
            for (const tag of tags) {
              if (tag.tag === 'title')
                tag.textContent = String(tag.textContent).toUpperCase()
            }
          },
        },
      }, () => {
        setup()
        return { key: 'setup' }
      }],
    })
    expect(setup).toHaveBeenCalledTimes(1)
    head.push({ title: 'loud' })
    await head.load()
    await vi.waitFor(() => expect(dom.window.document.title).toBe('LOUD'))
  })

  it('registers lazy plugins with the runtime', async () => {
    const dom = ssrDom(titled)
    const lazyPlugins = vi.fn(async () => [{ key: 'late', hooks: { 'tags:resolve': ({ tags }: any) => {
      for (const tag of tags) {
        if (tag.tag === 'title')
          tag.textContent = 'late'
      }
    } } }])
    const head = createLazyHead({ document: dom.window.document, lazyPlugins })
    head.push({ title: 'x' })
    expect(lazyPlugins).not.toHaveBeenCalled()
    await head.load()
    await vi.waitFor(() => expect(dom.window.document.title).toBe('late'))
    expect(head.plugins.has('late')).toBe(true)
  })

  it('load is idempotent and reports failure as a value', async () => {
    const dom = ssrDom(titled)
    const onLoadError = vi.fn()
    const head = createLazyHead({
      document: dom.window.document,
      onLoadError,
      lazyPlugins: () => Promise.reject(new Error('chunk failed')),
    })
    const first = head.load()
    expect(head.load()).toBe(first)
    expect(await first).toBe(false)
    expect(onLoadError).toHaveBeenCalledTimes(1)
    // a failed load resets, so a later call starts a new attempt
    expect(head.load()).not.toBe(first)
  })

  it('reports a failed first render as a failed load', async () => {
    const dom = ssrDom(titled)
    const onLoadError = vi.fn()
    const error = new Error('render failed')
    const head = createLazyHead({
      document: dom.window.document,
      onLoadError,
      render: () => {
        throw error
      },
    })
    head.push({ title: 'Client' })
    const first = head.load()
    expect(await first).toBe(false)
    expect(onLoadError).toHaveBeenCalledWith(error)
    expect(head.load()).not.toBe(first)
  })

  it('keeps the hook contract: unhook, ordered calls, and context mutation', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    const calls: string[] = []
    const off = head.hooks.hook('entries:updated', () => {
      calls.push('a')
    })
    head.hooks.hook('entries:updated', () => {
      calls.push('b')
    })
    head.push({ title: 'x' })
    off()
    head.push({ title: 'y' })
    expect(calls).toEqual(['a', 'b', 'b'])
    expect(head.hooks.callHook('dom:rendered' as any, {} as any)).toBeUndefined()
  })

  it('calls every listener when one unhooks itself during the call', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    const calls: string[] = []
    const off = head.hooks.hook('entries:updated', () => {
      calls.push('a')
      off()
    })
    head.hooks.hook('entries:updated', () => {
      calls.push('b')
    })
    head.push({ title: 'x' })
    expect(calls).toEqual(['a', 'b'])
  })

  it('stays inert with no document', async () => {
    const head = createLazyHead({ document: undefined })
    head.push({ title: 'x' })
    await settle()
    expect(head.ssr).toBe(false)
    expect(head.entries.size).toBe(1)
  })
})

describe('adoption at the first render', () => {
  it.each(['head', 'bodyOpen', 'bodyClose'] as const)('never inserts or executes a disposed buffered script: %s', async (tagPosition) => {
    const dom = new JSDOM('<!DOCTYPE html><title>Server</title>', { runScripts: 'dangerously' })
    const doc = dom.window.document
    Reflect.set(dom.window, 'executionCount', 0)
    const inserted: Node[] = []
    const observer = new dom.window.MutationObserver(records => records.forEach(record => inserted.push(...record.addedNodes)))
    observer.observe(doc.documentElement, { childList: true, subtree: true })
    const head = createLazyHead({ document: doc })
    head.push({ title: 'Server' })
    head.render()
    head.blockLoad()
    head.push({ script: [{ innerHTML: 'window.executionCount++', tagPosition }] }).dispose()
    head.push({ meta: [{ name: 'theme-color', content: 'blue' }] })
    head.render()
    await vi.waitFor(() => expect(doc.querySelector('meta[name="theme-color"]')).not.toBeNull())
    expect(Reflect.get(dom.window, 'executionCount')).toBe(0)
    expect(inserted.filter(node => node.nodeName === 'SCRIPT')).toEqual([])
    expect(doc.querySelector('script')).toBeNull()
    observer.disconnect()
    dom.window.close()
  })

  it('preserves a rendering pause when loading after a buffered change', async () => {
    const dom = ssrDom(titled)
    const { head, setPaused } = pausableHead(dom)
    setPaused(false)
    const entry = head.push(titled)
    head.render()
    head.blockLoad()
    entry.patch({ title: 'Historical', htmlAttrs: { lang: 'fr' } })
    entry.patch({ title: 'Live', htmlAttrs: { lang: 'en' } })
    setPaused(true)
    const before = dom.serialize()
    expect(await head.load()).toBe(true)
    await settle(30)
    expect(dom.serialize()).toBe(before)
    setPaused(false)
    head.render()
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Live'))
    expect(dom.window.document.documentElement.lang).toBe('en')
  })

  const root = { title: 'Root', meta: [{ name: 'description', content: 'root' }] }
  const page: ResolvableHead = { link: [{ rel: 'canonical', href: '/old' }], meta: [{ name: 'robots', content: 'noindex' }] }
  const next: ResolvableHead = { link: [{ rel: 'icon', href: '/new.ico' }] }

  it.each(['debounce', 'pause'] as const)('removes a server tag that a change drops after the load, before the first render: %s', async (window) => {
    const expected = ssrDom(root, page)
    const v3 = createClientHead({ document: expected.window.document })
    v3.push(root)
    v3.push(page).dispose()
    v3.push(next)
    v3.render()

    const dom = ssrDom(root, page)
    let paused = false
    const head = createLazyHead({ document: dom.window.document, hooks: { 'dom:beforeRender': (ctx) => {
      ctx.shouldRender = !paused
    } } })
    head.push(root)
    const entry = head.push(page)
    head.render()
    paused = window === 'pause'
    expect(await head.load()).toBe(true)
    // with a pause, the first render runs and waits, so no DOM state exists yet
    if (paused)
      await settle(20)
    entry.dispose()
    head.push(next)
    paused = false
    head.render()
    await vi.waitFor(() => expect(dom.window.document.head.innerHTML).toBe(expected.window.document.head.innerHTML))
  })
})
