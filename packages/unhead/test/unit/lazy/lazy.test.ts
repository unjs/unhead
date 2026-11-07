import type { ResolvableHead } from '../../../src/types'
import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'
import { createHead as createClientHead } from '../../../src/client'
import { createLazyHead } from '../../../src/lazy'
import { createHead as createServerHead, renderSSRHead } from '../../../src/server'

function ssrDom(input: ResolvableHead) {
  const head = createServerHead({ disableDefaults: true })
  head.push(input)
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

describe('createLazyHead', () => {
  it('stores entries and does not touch the document before load', async () => {
    const dom = ssrDom(titled)
    const before = dom.serialize()
    const { head } = pausableHead(dom)
    head.push({ title: 'Client only' })
    await settle()
    expect(dom.serialize()).toBe(before)
    expect([...head.entries.values()].map(e => e.input)).toEqual([{ title: 'Client only' }])
  })

  it('loads on idle and reconciles entries with the server document', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    head.push(titled)
    head.push({ meta: [{ name: 'client', content: 'yes' }] })
    const doc = dom.window.document
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

  it('blocks idle and change loads while dom:beforeRender pauses rendering', async () => {
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
    expect(load).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Next'))
  })

  it('a render after blockLoad with no change arms the idle load again', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    head.push({ title: 'Client' })
    head.blockLoad()
    head.render()
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Client'))
  })

  it('load runs during a load block when called directly', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    head.blockLoad()
    head.push({ title: 'Direct' })
    expect(await head.load()).toBe(true)
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Direct'))
  })

  it('blockLoad stops the pending idle load until the next render', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    head.push({ title: 'Client' })
    head.blockLoad()
    await settle()
    expect(dom.window.document.title).toBe('Server')

    head.render()
    await vi.waitFor(() => expect(dom.window.document.title).toBe('Client'))
  })

  it('loads at once for a change after hydration', async () => {
    const dom = ssrDom(titled)
    const head = createLazyHead({ document: dom.window.document })
    head.push(titled)
    head.render()
    const load = vi.spyOn(head, 'load')
    head.push({ title: 'After' })
    expect(load).toHaveBeenCalledTimes(1)
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
