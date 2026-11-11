import type { ResolvableHead } from '../../../src/types'
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHead } from '../../../src/lazy'
import { useScript } from '../../../src/scripts'
import { createHead as createServerHead, renderSSRHead } from '../../../src/server'

function ssrDom(...inputs: ResolvableHead[]) {
  const head = createServerHead({ disableDefaults: true })
  inputs.forEach(input => head.push(input))
  const { headTags, htmlAttrs, bodyAttrs, bodyTags, bodyTagsOpen } = renderSSRHead(head)
  return new JSDOM(`<!DOCTYPE html><html${htmlAttrs}><head>${headTags}</head><body${bodyAttrs}>${bodyTagsOpen}<div>app</div>${bodyTags}</body></html>`)
}

const settle = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))

const page: ResolvableHead = {
  title: 'Page',
  htmlAttrs: { lang: 'en', class: 'light' },
  meta: [{ name: 'description', content: 'About' }, { name: 'theme-color', content: '#fff' }],
  link: [{ rel: 'icon', href: '/favicon.svg' }],
}

// a value the client computes differently, such as one that reads the color mode
const clientOnly: ResolvableHead = { ...page, meta: [{ name: 'description', content: 'About' }, { name: 'theme-color', content: '#000' }] }
const themeColor = (doc: Document) => doc.querySelector('meta[name="theme-color"]')!.getAttribute('content')

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('load option', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
  })

  it('applies a client only value on the first change by default', async () => {
    const dom = ssrDom(page)
    const doc = dom.window.document
    const head = createHead({ document: doc })
    head.push(clientOnly)
    head.render()
    await settle()
    expect(themeColor(doc)).toBe('#fff')

    head.push({ title: 'Next' })
    await vi.waitFor(() => expect(doc.title).toBe('Next'))
    expect(themeColor(doc)).toBe('#000')
  })

  it('applies a client only value at idle with load: idle', async () => {
    const dom = ssrDom(page)
    const doc = dom.window.document
    const head = createHead({ document: doc, load: 'idle' })
    head.push(clientOnly)
    head.render()
    await vi.waitFor(() => expect(themeColor(doc)).toBe('#000'))
    expect(doc.title).toBe('Page')
  })

  it('holds an idle load during a load block until the block ends', async () => {
    const dom = ssrDom(page)
    const doc = dom.window.document
    const head = createHead({ document: doc, load: 'idle' })
    head.push(clientOnly)
    head.render()
    head.blockLoad()
    await settle()
    expect(themeColor(doc)).toBe('#fff')

    head.render()
    await vi.waitFor(() => expect(themeColor(doc)).toBe('#000'))
  })

  it('loads the runtime when useScript adds its script during hydration', async () => {
    const dom = ssrDom(page)
    const doc = dom.window.document
    const head = createHead({ document: doc })
    head.push(page)
    useScript(head, { src: '/analytics.js' }, { trigger: 'client' })
    head.render()
    await vi.waitFor(() => expect(doc.querySelector('script[src="/analytics.js"]')).not.toBeNull())
  })
})

describe('dev warning', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
  })

  async function warningsAfterHydration(server: ResolvableHead[], client: ResolvableHead[], options: Parameters<typeof createHead>[0] = {}) {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const dom = ssrDom(...server)
    const head = createHead({ document: dom.window.document, ...options })
    client.forEach(input => head.push(input))
    head.render()
    await settle()
    return { messages: warn.mock.calls.map(call => String(call[0])), dom }
  }

  it('names each client tag that differs from the server head, once', async () => {
    const { messages } = await warningsAfterHydration([page], [{
      ...page,
      htmlAttrs: { lang: 'en', class: 'dark' },
      link: [{ rel: 'icon', href: '/icon-dark.svg' }],
      meta: [{ name: 'description', content: 'About' }, { name: 'theme-color', content: '#000' }, { name: 'color-scheme', content: 'dark' }],
    }], { _entrySource: () => 'app.vue' } as any)
    expect(messages).toHaveLength(4)
    expect(messages.find(m => m.includes('<html>'))).toContain('differs from the server head in class')
    expect(messages.find(m => m.includes('<link rel="icon" href="/icon-dark.svg">'))).toContain('is missing from the server head')
    expect(messages.find(m => m.includes('<meta name="theme-color">'))).toContain('differs from the server head in content')
    expect(messages.find(m => m.includes('<meta name="color-scheme">'))).toContain('is missing from the server head')
    for (const message of messages) {
      expect(message).toContain('Pushed by app.vue.')
      expect(message).toContain(`set load: 'idle', or call head.load()`)
    }
  })

  it('names a title that differs', async () => {
    const { messages } = await warningsAfterHydration([page], [{ ...page, title: 'Client' }])
    expect(messages).toEqual([expect.stringContaining('<title> differs from the server head: "Client" on the client, "Page" in the document. Pushed by entry 1.')])
  })

  it('names crawler tags too, because they also wait for the first change', async () => {
    const { messages } = await warningsAfterHydration([page, { meta: [{ name: 'twitter:card', content: 'summary_large_image' }], link: [{ rel: 'canonical', href: '/a' }] }], [{
      ...page,
      meta: [{ name: 'description', content: 'Client' }, { name: 'theme-color', content: '#fff' }, { name: 'twitter:card', content: 'summary' }, { property: 'og:title', content: 'Client' }],
      link: [{ rel: 'icon', href: '/favicon.svg' }, { rel: 'canonical', href: '/b' }, { rel: 'alternate', hreflang: 'de', href: '/de' }],
      script: [{ type: 'application/ld+json', innerHTML: { a: 1 } }],
    }])
    for (const tag of ['<meta name="twitter:card">', '<meta property="og:title">', '<link rel="canonical" href="/b">', '<script> is missing'])
      expect(messages.some(m => m.includes(tag)), tag).toBe(true)
  })

  it('warns once per tag and source across page loads', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const dom = new JSDOM('', { url: 'https://site.test/' })
    // each page load hydrates a fresh head on a new server document, in the same browser tab
    for (const [title, color] of [['A', '#111'], ['B', '#222'], ['C', '#111']]) {
      const server = ssrDom({ title, meta: [{ name: 'theme-color', content: '#fff' }] })
      dom.window.document.documentElement.innerHTML = server.window.document.documentElement.innerHTML
      const head = createHead({ document: dom.window.document, ...{ _entrySource: () => 'app.vue' } as object })
      head.push({ title: `${title} client`, meta: [{ name: 'theme-color', content: color }] })
      head.render()
      await settle()
    }
    const messages = warn.mock.calls.map(call => String(call[0]))
    expect(messages).toHaveLength(2)
    expect(messages[0]).toContain('<title> differs from the server head: "A client" on the client')
    expect(messages[1]).toContain('<meta name="theme-color"> differs from the server head in content')
  })

  it('is silent when the client pushes the server input', async () => {
    const { messages } = await warningsAfterHydration([page], [page])
    expect(messages).toEqual([])
  })

  it('is silent for server only entries', async () => {
    const { messages } = await warningsAfterHydration([page, { meta: [{ property: 'og:image', content: '/og.png' }] }], [page])
    expect(messages).toEqual([])
  })

  it('leaves the document and the runtime alone', async () => {
    const before = ssrDom(page).serialize()
    const { dom } = await warningsAfterHydration([page], [{ ...page, title: 'Client' }])
    expect(dom.serialize()).toBe(before)
  })

  it('is silent with load: idle', async () => {
    const { messages } = await warningsAfterHydration([page], [{ ...page, title: 'Client' }], { load: 'idle' })
    expect(messages).toEqual([])
  })

  it('resolves template params from lazy plugins before it compares', async () => {
    const { TemplateParamsPlugin } = await import('../../../src/plugins')
    const server = createServerHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    const input = { title: 'Home', titleTemplate: '%s %separator %siteName', templateParams: { separator: '|', siteName: 'Site' } }
    server.push(input)
    const { headTags } = renderSSRHead(server)
    const dom = new JSDOM(`<!DOCTYPE html><html><head>${headTags}</head><body></body></html>`)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const head = createHead({ document: dom.window.document, lazyPlugins: async () => [TemplateParamsPlugin] })
    head.push(input)
    head.render()
    await settle()
    expect(warn).not.toHaveBeenCalled()
  })

  it('reports a failing lazy plugin loader as a warning, not an unhandled rejection', async () => {
    const rejections: unknown[] = []
    const onRejection = (reason: unknown) => rejections.push(reason)
    process.on('unhandledRejection', onRejection)
    try {
      const { messages } = await warningsAfterHydration([page], [page], { lazyPlugins: () => Promise.reject(new Error('chunk failed')) })
      expect(rejections).toEqual([])
      expect(messages).toEqual([expect.stringContaining('[unhead]')])
    }
    finally {
      process.off('unhandledRejection', onRejection)
    }
  })
})
