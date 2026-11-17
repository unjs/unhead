import type { HeadPluginInput, ResolvableHead } from '../../../src/types'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHead as createClientHead } from '../../../src/client'
import { useSeoMeta } from '../../../src/composables'
import { createHead as createLazyHead } from '../../../src/lazy'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createServerHead, renderSSRHead } from '../../../src/server'

function ssrDom(plugins: HeadPluginInput[], ...inputs: ResolvableHead[]) {
  const head = createServerHead({ disableDefaults: true, plugins })
  inputs.forEach(input => head.push(input))
  const { headTags, htmlAttrs, bodyAttrs, bodyTags, bodyTagsOpen } = renderSSRHead(head)
  return new JSDOM(`<!DOCTYPE html><html${htmlAttrs}><head>${headTags}</head><body${bodyAttrs}>${bodyTagsOpen}<div>app</div>${bodyTags}</body></html>`)
}

const settle = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms))

// The whole document a user and a crawler see: the title, the attrs, and every head and body tag.
function html(dom: JSDOM) {
  const doc = dom.window.document
  const tags = (el: Element) => [...el.children].map(c => c.outerHTML)
  return { title: doc.title, html: doc.documentElement.getAttributeNames().map(n => `${n}=${doc.documentElement.getAttribute(n)}`), body: doc.body.getAttributeNames().map(n => `${n}=${doc.body.getAttribute(n)}`), head: tags(doc.head), bodyTags: tags(doc.body) }
}

type Step = (head: any, entries: any[], pause: () => void) => void

// Runs the same pushes on the default client head and on the lazy head, from the same server HTML.
// A step can pause both heads, as Nuxt does from `page:loading:start` to `page:loading:end`.
// The pause lifts before the render that ends the step.
async function both(plugins: HeadPluginInput[], server: ResolvableHead[], steps: Step[]) {
  const offDom = ssrDom(plugins, ...server)
  const off = createClientHead({ document: offDom.window.document, plugins })
  const lazyDom = ssrDom(plugins, ...server)
  const lazy = createLazyHead({ document: lazyDom.window.document, lazyPlugins: async () => plugins })
  let paused = false
  const pause = () => {
    paused = true
  }
  for (const head of [off, lazy]) {
    head.hooks.hook('dom:beforeRender', (ctx: { shouldRender: boolean }) => {
      ctx.shouldRender = !paused
    })
  }
  const load = vi.spyOn(lazy, 'load')
  const offEntries = server.map(input => off.push(input))
  const lazyEntries = server.map(input => lazy.push(input))
  off.render()
  lazy.render()
  for (const step of steps) {
    step(off, offEntries, pause)
    step(lazy, lazyEntries, pause)
    paused = false
    off.render()
    lazy.render()
    await settle()
  }
  return { off: html(offDom), lazy: html(lazyDom), lazyDom, offDom, load }
}

const site = { titleTemplate: '%s %separator %siteName', templateParams: { siteName: 'Site', separator: '·' } }
function page(name: string): ResolvableHead {
  return {
    title: name,
    meta: [
      { name: 'description', content: `About ${name}` },
      { property: 'og:title', content: `${name} %separator %siteName` },
      { name: 'twitter:card', content: 'summary' },
    ],
    link: [{ rel: 'canonical', href: `https://site.test/${name}` }],
    script: [{ type: 'application/ld+json', innerHTML: { name } }],
  }
}

// a navigation: the old page entry goes, the new one comes, and the next render ends it
function navigate(name: string): Step {
  return (head, entries, pause) => {
    pause()
    entries.pop()!.dispose()
    entries.push(head.push(page(name)))
  }
}

const tags = (n: number, prefix = 'tag') => Array.from({ length: n }, (_, i) => ({ property: 'article:tag' as const, content: `${prefix}-${i}` }))
const inferred: ResolvableHead = { meta: [{ 'property': 'og:title', 'data-infer': '', 'content': 'A' }] }
const patchPage = (input: ResolvableHead): Step => (_, entries) => entries.at(-1).patch(input)
function replacePage(input: ResolvableHead): Step {
  return (head, entries) => {
    entries.pop()!.dispose()
    entries.push(head.push(input))
  }
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production')
  return () => vi.unstubAllEnvs()
})

describe('lazy head parity with the default head', () => {
  it.each([
    ['crawler tags alone', (_: any, entries: any[]) => entries[0].patch({ ...page('a'), meta: [{ name: 'description', content: 'New' }, { property: 'og:image', content: '/new.png' }], link: [{ rel: 'alternate', hreflang: 'de', href: '/de' }] })],
    ['the title alone', (_: any, entries: any[]) => entries[0].patch({ ...page('a'), title: 'b' })],
  ])('loads the runtime for a change to %s, and matches the default head', async (_, step) => {
    const { offDom, lazyDom, load } = await both([], [page('a')], [step])
    expect(load).toHaveBeenCalled()
    await vi.waitFor(() => expect(html(lazyDom)).toEqual(html(offDom)))
  })

  it('loads the runtime for crawler keys of useSeoMeta', async () => {
    const dom = ssrDom([], { title: 'A' })
    const head = createLazyHead({ document: dom.window.document })
    const load = vi.spyOn(head, 'load')
    head.push({ title: 'A' })
    head.render()
    useSeoMeta(head, { ogTitle: 'A', twitterCard: 'summary_large_image' })
    expect(load).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(dom.window.document.querySelector('meta[name="twitter:card"]')).not.toBeNull())
  })

  it('matches the default head over navigations through template params', async () => {
    const { offDom, lazyDom, load } = await both([TemplateParamsPlugin], [site, page('Home')], [navigate('Pricing'), navigate('Docs'), navigate('Tools')])
    expect(load).toHaveBeenCalled()
    expect(lazyDom.window.document.title).toBe('Tools · Site')
    expect(html(lazyDom)).toEqual(html(offDom))
  })

  it('loads for a title change while a dom:rendered listener waits', async () => {
    const dom = ssrDom([], { title: 'A' })
    const head = createLazyHead({ document: dom.window.document })
    const load = vi.spyOn(head, 'load')
    const rendered = vi.fn()
    const entry = head.push({ title: 'A' }, { onRendered: rendered })
    head.render()
    entry.patch({ title: 'B' })
    expect(load).toHaveBeenCalled()
    await vi.waitFor(() => expect(rendered).toHaveBeenCalled())
  })

  it('loads for a new value that is not a plain object, such as a promise', async () => {
    const dom = ssrDom([], { title: 'A' })
    const head = createLazyHead({ document: dom.window.document })
    const load = vi.spyOn(head, 'load')
    const entry = head.push({ title: 'A', link: [{ rel: 'stylesheet', href: Promise.resolve('/a.css') }] } as any)
    head.render()
    entry.patch({ title: 'A', link: [{ rel: 'stylesheet', href: Promise.resolve('/b.css') }] } as any)
    await vi.waitFor(() => expect(load).toHaveBeenCalled())
  })

  it.each([
    ['on the first navigation', [] as string[]],
    ['after a title only navigation', ['Other']],
  ])('removes the prev and next links of a disposed page %s', async (_, before) => {
    const guide: ResolvableHead = { title: 'Guide', link: [{ rel: 'prev', href: '/a', key: 'prev' }, { rel: 'next', href: '/b', key: 'next' }] }
    const steps: Step[] = [
      ...before.map(name => (head: any, entries: any[], pause: () => void) => {
        pause()
        entries.push(head.push({ title: name }))
      }),
      (head, entries, pause) => {
        pause()
        entries.splice(1).forEach(e => e.dispose())
        entries.push(head.push({ title: 'Home' }))
      },
      (_, __, pause) => {
        pause()
      },
    ]
    const { lazyDom, off, lazy, load } = await both([], [{ titleTemplate: '%s | Site' }, guide], steps)
    expect(load).toHaveBeenCalled()
    await vi.waitFor(() => expect(lazyDom.window.document.querySelectorAll('link[rel="prev"], link[rel="next"]')).toHaveLength(0))
    expect(lazy).toEqual(off)
  })

  // A change before the load leaves the server tags of the hydrated entry in the document.
  // The runtime must still remove them.
  describe('a change before the load', () => {
    it.each<[string, ResolvableHead, Step]>([
      ['a patch shortens a list of tags', { meta: tags(3) }, patchPage({ meta: tags(1) })],
      ['a patch shortens a list of tags and changes its values', { meta: tags(3) }, patchPage({ meta: tags(1, 'new') })],
      ['a patch removes an attribute', inferred, patchPage({ meta: [{ property: 'og:title', content: 'A' }] })],
      ['a navigation shortens a list of tags', { meta: tags(3) }, replacePage({ meta: tags(2, 'new') })],
      ['a navigation removes an attribute', inferred, replacePage({ meta: [{ property: 'og:title', content: 'B' }] })],
    ])('matches the default head when %s', async (_, server, change) => {
      const { offDom, lazyDom, load } = await both([], [{ title: 'Site' }, server], [change])
      expect(load).toHaveBeenCalled()
      await vi.waitFor(() => expect(html(lazyDom)).toEqual(html(offDom)))
    })
  })

  // The server rendered this late entry too, so its tags are the ones in the document.
  it('restores the hydrated tags that an entry pushed during the pause after hydration overrode with a shorter list, once it is disposed', async () => {
    const page = tags(4, 'page')
    const late = tags(2, 'late')
    const doc = ssrDom([], { meta: page }, { meta: late }).window.document
    let paused = false
    const head = createLazyHead({ document: doc })
    head.hooks.hook('dom:beforeRender', (ctx) => {
      ctx.shouldRender = !paused
    })
    head.push({ meta: page })
    head.render()
    paused = true
    const entry = head.push({ meta: late })
    await settle()
    entry.dispose()
    head.push({ link: [{ rel: 'stylesheet', href: '/home.css' }] })
    paused = false
    head.render()
    await vi.waitFor(() => expect(doc.querySelector('link[rel="stylesheet"]')).not.toBeNull())
    expect([...doc.querySelectorAll('meta[property="article:tag"]')].map(el => el.getAttribute('content'))).toEqual(page.map(tag => tag.content))
  })

  // The renderer seeds html and body class cleanups from the live input of each entry. An edit
  // in place makes that input differ from the hydrated copy that the adoption renders.
  it.each([
    ['swaps a class', 'a c'],
    ['drops a class', 'a'],
    ['drops every class', ''],
  ])('matches the default head when a paused step %s in place', async (_, next) => {
    const input = { title: 'Site', htmlAttrs: { class: 'a b' }, bodyAttrs: { class: 'a b' } }
    const { off, lazy, load } = await both([], [input], [(__, entries, pause) => {
      pause()
      input.htmlAttrs.class = next
      input.bodyAttrs.class = next
      entries[0].patch(input)
    }])
    expect(load).toHaveBeenCalled()
    expect(lazy).toEqual(off)
  })

  it('restores the server title as the base of a later runtime render', async () => {
    const { off, lazy } = await both([], [{ title: 'A' }], [
      (_, entries) => entries[0].patch({ title: 'B' }),
      (_, entries) => entries[0].dispose(),
      (head, entries) => entries.push(head.push({ link: [{ rel: 'stylesheet', href: '/a.css' }] })),
    ])
    await vi.waitFor(() => expect(lazy).toEqual(off))
  })
})
