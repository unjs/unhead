import type { ResolvableHead } from '../../../src/types'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHead as createClientHead, renderDOMHead } from '../../../src/client'
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
  const head = createLazyHead({ document: dom.window.document, hooks: {
    'dom:beforeRender': (ctx) => {
      ctx.shouldRender = !paused
    },
  } })
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
  it.each(['dispose', 'patch'] as const)('removes a departed SSR stylesheet registered after early load: %s', async (operation) => {
    const input: ResolvableHead = { link: [{ rel: 'stylesheet', href: '/server.css' }] }
    const dom = ssrDom(input)
    const { head, setPaused } = pausableHead(dom)
    await head.load()
    const entry = head.push(input)
    // Let the first render attempt observe the pause before leaving the route.
    await settle(20)
    expect(dom.window.document.querySelector('link')?.getAttribute('href')).toBe('/server.css')
    head.finishHydration()
    const destination: ResolvableHead = { link: [{ rel: 'stylesheet', href: '/destination.css' }] }
    if (operation === 'dispose') {
      entry.dispose()
      head.push(destination)
    }
    else {
      entry.patch(destination)
    }
    setPaused(false)
    head.render()
    await vi.waitFor(() => expect([...dom.window.document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.getAttribute('href'))).toEqual(['/destination.css']))
    dom.window.close()
  })

  it('stores entries and does not touch the document before load', async () => {
    const dom = ssrDom(titled)
    const before = dom.serialize()
    const { head } = pausableHead(dom)
    head.push({ title: 'Client only' })
    await settle()
    expect(dom.serialize()).toBe(before)
    expect(head.render()).toBe(false)
  })

  it('loads nothing when hydration ends with no change', async () => {
    const dom = ssrDom(titled)
    const before = dom.serialize()
    const head = createLazyHead({ document: dom.window.document })
    const load = vi.spyOn(head, 'load')
    head.push(titled)
    head.finishHydration()
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

  it.each(['before', 'after'] as const)('keeps a newer patch over an in-place edit queued %s the load starts', async (when) => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    const entry = head.push(titled)
    head.finishHydration()
    const input = { ...titled }
    entry.patch(input)
    input.title = 'Edited'
    entry.patch(input)
    const loading = when === 'after' ? head.load() : undefined
    entry.patch({ ...titled, title: 'Newer' })
    await (loading ?? head.load())
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Newer'))
    await settle(30)
    expect(dom.window.document.title).toBe('Newer')
  })

  it('removes the server element of an entry disposed before load', async () => {
    const dom = ssrDom(titled)
    const { head, setPaused } = pausableHead(dom)
    setPaused(false)
    const entry = head.push(titled)
    head.finishHydration()
    setPaused(true)
    entry.dispose()
    setPaused(false)
    await head.load()
    await vi.waitFor(() => expect(dom.window.document.querySelector('meta[name="description"]')).toBeNull())
  })

  it.each([false, true])('removes an SSR stylesheet disposed before hydration ends (render: %s)', async (render) => {
    const input: ResolvableHead = { link: [{ rel: 'stylesheet', href: '/server.css' }] }
    const dom = ssrDom(input)
    const head = createLazyHead({ document: dom.window.document })
    const entry = head.push(input)
    entry.dispose()
    if (render)
      head.finishHydration()
    await head.load()
    await vi.waitFor(() => expect([...dom.window.document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.getAttribute('href'))).toEqual([]))
  })

  it('removes obsolete links patched repeatedly before hydration ends', async () => {
    const input: ResolvableHead = { link: [{ rel: 'prev', href: '/server' }] }
    const dom = ssrDom(input)
    const head = createLazyHead({ document: dom.window.document })
    const entry = head.push(input)
    entry.patch({ link: [{ rel: 'prev', href: '/intermediate' }] })
    entry.patch({ link: [{ rel: 'prev', href: '/client' }] })
    await head.load()
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
    await loading
    await vi.waitFor(() => expect([...dom.window.document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.getAttribute('href'))).toEqual([]))
  })

  it('removes the server element when a patch before load changes its identity', async () => {
    const input: ResolvableHead = { link: [{ rel: 'prev', href: '/a' }] }
    const dom = ssrDom(input)
    const { head, setPaused } = pausableHead(dom)
    setPaused(false)
    const entry = head.push(input)
    head.finishHydration()
    setPaused(true)
    entry.patch({ link: [{ rel: 'prev', href: '/b' }] })
    setPaused(false)
    await head.load()
    await vi.waitFor(() => {
      const links = dom.window.document.querySelectorAll('link[rel="prev"]')
      expect(links).toHaveLength(1)
      expect(links[0].getAttribute('href')).toBe('/b')
    })
  })

  it('removes the original SSR stylesheet when a getter changes before load', async () => {
    let href = '/server.css'
    const input: ResolvableHead = { link: [{ rel: 'stylesheet', href: () => href }] }
    const dom = ssrDom({ link: [{ rel: 'stylesheet', href: '/layout.css' }] }, input)
    const doc = dom.window.document
    const head = createLazyHead({ document: doc })
    const entry = head.push(input)
    head.finishHydration()

    href = '/client.css'
    entry.patch(input)
    await head.load()

    await vi.waitFor(() => {
      const links = doc.querySelectorAll('link[rel="stylesheet"]')
      expect([...links].map(link => link.getAttribute('href'))).toEqual(['/layout.css', '/client.css'])
    })
  })

  it('leaves the error of a getter that throws to the render', () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    const input: ResolvableHead = {
      title: () => {
        throw new Error('no title yet')
      },
    }
    expect(() => head.push(input)).not.toThrow()
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
    await head.load()
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
    await head.load()
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Patched'))
    expect(dom.window.document.querySelector('meta[name="other"]')?.outerHTML).toBeUndefined()
  })

  it('keeps a dispose a plugin makes during the adoption render of a client only entry', async () => {
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
    entry.patch({ title: 'Patched' })
    head.finishHydration()
    other = head.push({ meta: [{ name: 'client', content: 'yes' }] })
    await head.load()
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Patched'))
    expect(dom.window.document.querySelector('meta[name="client"]')?.outerHTML).toBeUndefined()
  })

  it('leaves the document to a custom render option during adoption', async () => {
    const dom = ssrDom(titled)
    const render = vi.fn()
    const head = createLazyHead({ document: dom.window.document, render })
    const entry = head.push({ title: 'Client' })
    entry.patch({ title: 'Patched' })
    const client = await head.load()
    expect(render).toHaveBeenCalledWith(client)
    expect(dom.window.document.title).toBe('Server')
  })

  it('fires dom:rendered once when a load follows a change', async () => {
    const dom = ssrDom(titled)
    const rendered = vi.fn()
    let paused = false
    const head = createLazyHead({ document: dom.window.document, hooks: {
      'dom:rendered': rendered,
      'dom:beforeRender': (ctx) => {
        ctx.shouldRender = !paused
      },
    } })
    const entry = head.push(titled)
    head.render()
    paused = true
    entry.dispose()
    paused = false
    await head.load()
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

  it('runs plugin setup and hooks after load', async () => {
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
    head.push({ title: 'loud' })
    expect(setup).not.toHaveBeenCalled()
    await head.load()
    expect(setup).toHaveBeenCalledOnce()
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
  })

  it('shares activation and retries after a plugin loader rejects', async () => {
    const { document } = ssrDom(titled).window
    const lazyPlugins = vi.fn<() => Promise<[]>>()
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValueOnce([])
    const head = createLazyHead({ document, lazyPlugins })
    head.finishHydration()
    const entry = head.push({ title: 'Queued' })
    const first = head.load()
    expect(head.load()).toBe(first)
    await expect(first).rejects.toThrow('chunk failed')
    expect(document.title).toBe('Server')

    entry.patch({ title: 'Retried' })
    const client = await head.load()
    expect(await head.load()).toBe(client)
    await vi.waitFor(() => expect(document.title).toBe('Retried'))
  })

  it('connects before a custom renderer uses the shell', async () => {
    const { document } = ssrDom(titled).window
    let pushed = false
    const head = createLazyHead({
      document,
      render(client) {
        if (!pushed) {
          pushed = true
          head.push({ title: 'Pushed by render' })
        }
        return renderDOMHead(client)
      },
    })
    await head.load()
    expect(document.title).toBe('Pushed by render')
  })

  it('stays inert with no document', async () => {
    const head = createLazyHead({ document: undefined })
    head.push({ title: 'x' })
    await settle()
    expect(head.ssr).toBe(false)
    expect(head.render()).toBe(false)
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
    let paused = false
    const head = createLazyHead({ document: doc, hooks: {
      'dom:beforeRender': (ctx) => {
        ctx.shouldRender = !paused
      },
    } })
    head.push({ title: 'Server' })
    head.render()
    paused = true
    head.push({ script: [{ innerHTML: 'window.executionCount++', tagPosition }] }).dispose()
    head.push({ meta: [{ name: 'theme-color', content: 'blue' }] })
    paused = false
    await head.load()
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
    head.finishHydration()
    setPaused(true)
    entry.patch({ title: 'Historical', htmlAttrs: { lang: 'fr' } })
    entry.patch({ title: 'Live', htmlAttrs: { lang: 'en' } })
    const before = dom.serialize()
    await head.load()
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
    await head.load()
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
