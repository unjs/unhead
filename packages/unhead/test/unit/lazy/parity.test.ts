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

type Step = (head: any, entries: any[]) => void

// Runs the same pushes on the default client head and on the lazy head, from the same server HTML.
async function both(plugins: HeadPluginInput[], server: ResolvableHead[], steps: Step[]) {
  const offDom = ssrDom(plugins, ...server)
  const off = createClientHead({ document: offDom.window.document, plugins })
  const lazyDom = ssrDom(plugins, ...server)
  const lazy = createLazyHead({ document: lazyDom.window.document, lazyPlugins: async () => plugins })
  const load = vi.spyOn(lazy, 'load')
  const offEntries = server.map(input => off.push(input))
  const lazyEntries = server.map(input => lazy.push(input))
  off.render()
  lazy.render()
  for (const step of steps) {
    step(off, offEntries)
    step(lazy, lazyEntries)
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
  return (head, entries) => {
    head.blockLoad?.()
    entries.pop()!.dispose()
    entries.push(head.push(page(name)))
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
      ...before.map(name => (head: any, entries: any[]) => {
        head.blockLoad?.()
        entries.push(head.push({ title: name }))
      }),
      (head, entries) => {
        head.blockLoad?.()
        entries.splice(1).forEach(e => e.dispose())
        entries.push(head.push({ title: 'Home' }))
      },
      (head) => {
        head.blockLoad?.()
      },
    ]
    const { lazyDom, off, lazy, load } = await both([], [{ titleTemplate: '%s | Site' }, guide], steps)
    expect(load).toHaveBeenCalled()
    await vi.waitFor(() => expect(lazyDom.window.document.querySelectorAll('link[rel="prev"], link[rel="next"]')).toHaveLength(0))
    expect(lazy).toEqual(off)
  })

  // Nuxt pauses DOM updates from the first page:start. A hydrating page can push or patch its
  // entries after the head marked the end of hydration, while the pause still holds. The
  // Nuxt `<Head>` component pushes an empty entry and patches it once it renders.
  it.each(['push', 'patch', 'mutation'])('removes server links of an entry that a %s adds during the pause after hydration, once it is disposed', async (how) => {
    const links: ResolvableHead = { link: [{ rel: 'prev', href: '/a', key: 'prev' }, { rel: 'next', href: '/b', key: 'next' }] }
    const dom = ssrDom([], { title: 'Guide' }, links)
    const doc = dom.window.document
    let paused = false
    const head = createLazyHead({ document: doc })
    head.hooks.hook('dom:beforeRender', (ctx) => {
      ctx.shouldRender = !paused
    })
    const page = head.push({ title: 'Guide' })
    // the mutation case edits one input object in place and patches with it, as a reactive object does
    const input: any = {}
    const early = how === 'push' ? undefined : head.push(input)
    head.render()
    paused = true
    const late = early || head.push(links)
    if (how === 'mutation')
      early!.patch(Object.assign(input, links))
    else
      early?.patch(links)
    await settle()
    head.blockLoad()
    if (how === 'mutation')
      input.link = input.link.map(() => null)
    late.dispose()
    page.dispose()
    head.push({ title: 'Home', link: [{ rel: 'stylesheet', href: '/home.css' }] })
    paused = false
    head.render()
    await vi.waitFor(() => expect(doc.querySelector('link[rel="stylesheet"]')).not.toBeNull())
    expect(doc.querySelectorAll('link[rel="prev"], link[rel="next"]')).toHaveLength(0)
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
