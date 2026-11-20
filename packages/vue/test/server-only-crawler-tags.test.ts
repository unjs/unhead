// @vitest-environment jsdom
import type { StreamingGlobal } from 'unhead/stream/client'
import type { CreateClientHeadOptions } from 'unhead/types'
import { renderToString } from '@vue/server-renderer'
import { useSeoMeta as useCoreSeoMeta } from 'unhead'
import { createHead as createCoreClientHead } from 'unhead/client'
import * as unheadPlugins from 'unhead/plugins'
import { createStreamableHead as wrapStreamedHead } from 'unhead/stream/client'
import { createStreamableHead as createStreamingServer, renderShell, renderSSRHeadSuspenseChunk } from 'unhead/stream/server'
import { VIRTUAL_CLIENT_ID } from 'unhead/stream/unplugin'
import { describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { init as initStreamingIife } from '../../unhead/src/stream/iife'
import { useHead, useSeoMeta } from '../src'
import { Unhead } from '../src/bundler'
import { createHead as createClientHead } from '../src/client'
import { createHead as createServerHead, renderSSRHead } from '../src/server'

const PAGES = {
  a: `useSeoMeta({ title: 'Page A', description: 'A desc', ogTitle: 'A og', twitterCard: 'summary' })
useHead({
  htmlAttrs: { lang: 'en' },
  bodyAttrs: { class: 'page-a' },
  link: [{ rel: 'canonical', href: '/a' }, { rel: 'stylesheet', href: '/a.css' }],
  script: [{ type: 'application/ld+json', innerHTML: '{"@id":"a"}' }],
})`,
  b: `useSeoMeta({ title: 'Page B', description: 'B desc', ogTitle: 'B og' })
useHead({ bodyAttrs: { class: 'page-b' }, link: [{ rel: 'canonical', href: '/b' }] })`,
} as const

type Page = keyof typeof PAGES

/** The page sources as a build emits them for `consumer`, with the option on or off. */
async function build(consumer: 'client' | 'server', serverOnlyCrawlerTags: boolean): Promise<Record<Page, string>> {
  const plugin = Unhead({ serverOnlyCrawlerTags, devtools: false, validate: false }).vite().find(p => p.name === 'unhead:server-only-crawler-tags') as any
  const out = {} as Record<Page, string>
  for (const page of Object.keys(PAGES) as Page[]) {
    const res = plugin && await plugin.transform.handler.call({ environment: { config: { consumer } } }, PAGES[page], `${page}.ts`)
    out[page] = res?.code ?? PAGES[page]
  }
  return out
}

const CLIENT_ENTRY = `import { createHead } from 'unhead/client'
setHead(createHead(options))`

/** Imports as `const` bindings, so `new Function()` can run a transformed module. */
function bindImports(code: string) {
  return code.replace(/import\s*\{([^}]+)\}\s*from\s*(['"])([^'"]+)\2;?/g, (_, names: string, _quote: string, source: string) =>
    `const {${names.replace(/ as /g, ': ')}} = modules[${JSON.stringify(source)}];`)
}

/** The client head as a build creates it: the option wraps `createHead()` from `unhead/client`. */
async function createBuiltClientHead<T>(serverOnlyCrawlerTags: boolean, options: CreateClientHeadOptions, createHead: (options: CreateClientHeadOptions) => T): Promise<T> {
  const plugin = Unhead({ serverOnlyCrawlerTags, devtools: false, validate: false }).vite().find(p => p.name === 'unhead:server-only-crawler-tags-runtime') as any
  const res = plugin && await plugin.transform.handler.call({ environment: { config: { consumer: 'client' } } }, CLIENT_ENTRY, 'main.ts')
  const modules = { 'unhead/client': { createHead }, 'unhead/plugins': unheadPlugins }
  let head: T | undefined
  // eslint-disable-next-line no-new-func
  new Function('modules', 'options', 'setHead', bindImports(res?.code ?? CLIENT_ENTRY))(modules, options, (h: T) => head = h)
  return head!
}

function createApp(sources: Record<Page, string>, current: ReturnType<typeof ref<Page>>) {
  const components = Object.fromEntries(Object.entries(sources).map(([page, code]) => [page, defineComponent({
    setup() {
      // eslint-disable-next-line no-new-func
      new Function('useHead', 'useSeoMeta', code)(useHead, useSeoMeta)
      return () => h('main', page)
    },
  })])) as Record<Page, ReturnType<typeof defineComponent>>
  return createSSRApp({ setup: () => () => h(components[current.value!]) })
}

function snapshot() {
  const { documentElement: html, head, body } = document
  return {
    title: document.title,
    htmlAttrs: html.getAttributeNames().map(n => `${n}=${html.getAttribute(n)}`),
    bodyAttrs: body.getAttributeNames().map(n => `${n}=${body.getAttribute(n)}`),
    head: [...head.children].map(el => el.outerHTML),
  }
}

const settle = () => new Promise(resolve => setTimeout(resolve, 20))

type HeadInstance = ReturnType<typeof createClientHead>

/** Tags a module pushes at runtime, on the server and the client, like a site-wide default. */
function pushRuntimeEntry(head: HeadInstance, page: Page) {
  head.push({ meta: [{ name: 'description', content: 'Module default' }, { name: 'twitter:card', content: 'summary_large_image' }] }, { tagPriority: 'low' })
  return head.push({ style: [{ key: 'runtime', textContent: `.runtime{content:"${page}"}` }] })
}

async function run(serverOnlyCrawlerTags: boolean, runtimeEntry = false) {
  // SSR page A with the server build
  const serverHead = createServerHead({ disableDefaults: true })
  if (runtimeEntry)
    pushRuntimeEntry(serverHead as unknown as HeadInstance, 'a')
  const serverApp = createApp(await build('server', serverOnlyCrawlerTags), ref<Page>('a'))
  serverApp.use(serverHead)
  const appHtml = await renderToString(serverApp)
  const ssr = await renderSSRHead(serverHead)

  for (const n of document.documentElement.getAttributeNames())
    document.documentElement.removeAttribute(n)
  document.documentElement.innerHTML = `<head>${ssr.headTags}</head><body><div id="app">${appHtml}</div></body>`
  const attrs = new DOMParser().parseFromString(`<html${ssr.htmlAttrs}><body${ssr.bodyAttrs}></body></html>`, 'text/html')
  for (const n of attrs.documentElement.getAttributeNames())
    document.documentElement.setAttribute(n, attrs.documentElement.getAttribute(n)!)
  for (const n of attrs.body.getAttributeNames())
    document.body.setAttribute(n, attrs.body.getAttribute(n)!)
  const server = snapshot()

  // hydrate with the client build, then navigate to page B
  const current = ref<Page>('a')
  const clientApp = createApp(await build('client', serverOnlyCrawlerTags), current)
  const clientHead = await createBuiltClientHead(serverOnlyCrawlerTags, { document }, createClientHead)
  const runtime = runtimeEntry ? pushRuntimeEntry(clientHead, 'a') : undefined
  clientApp.use(clientHead)
  clientApp.mount('#app')
  await settle()
  const hydrated = snapshot()

  current.value = 'b'
  runtime?.patch({ style: [{ key: 'runtime', textContent: '.runtime{content:"b"}' }] })
  await nextTick()
  await settle()
  const navigated = snapshot()
  clientApp.unmount()
  return { server, hydrated, navigated }
}

describe('serverOnlyCrawlerTags with Vue SSR and hydration', () => {
  it('server HTML is the same with the option on or off', async () => {
    expect((await run(true)).server).toEqual((await run(false)).server)
  })

  it('hydration changes nothing in the server HTML', async () => {
    const on = await run(true)
    expect(on.hydrated).toEqual(on.server)
  })

  it('updates user-visible tags after navigation and keeps crawler tags once', async () => {
    const on = await run(true)
    const off = await run(false)

    // what a user sees matches the build without the option
    expect(on.navigated.title).toBe('Page B')
    expect(on.navigated.title).toBe(off.navigated.title)
    expect(on.navigated.htmlAttrs).toEqual(off.navigated.htmlAttrs)
    expect(on.navigated.bodyAttrs).toEqual(off.navigated.bodyAttrs)
    const userVisible = (head: string[]) => head.filter(t => /<title|stylesheet|<style|<script(?! type="application\/ld\+json")/.test(t))
    expect(userVisible(on.navigated.head)).toEqual(userVisible(off.navigated.head))
    expect(on.navigated.head.some(t => t.includes('a.css'))).toBe(false)

    // crawler tags keep the server values: stale, never removed or duplicated
    const count = (re: RegExp) => on.navigated.head.filter(t => re.test(t)).length
    expect(count(/rel="canonical"/)).toBe(1)
    expect(count(/property="og:title"/)).toBe(1)
    expect(count(/name="description"/)).toBe(1)
    expect(count(/application\/ld\+json/)).toBe(1)
    expect(off.navigated.head).toContain('<link rel="canonical" href="/b">')
    expect(on.navigated.head).toContain('<link rel="canonical" href="/a">')
    expect(on.navigated.head).toContain('<meta property="og:title" content="A og">')
  })

  it('keeps server crawler tags when a runtime entry pushes its own', async () => {
    const on = await run(true, true)
    const crawler = (head: string[]) => head.filter(t => /name="(?:description|twitter:card)"/.test(t))
    expect(crawler(on.server.head)).toEqual([
      '<meta name="description" content="A desc">',
      '<meta name="twitter:card" content="summary">',
    ])
    // the client build has only the module default; it must not reach the DOM
    expect(crawler(on.hydrated.head)).toEqual(crawler(on.server.head))
    expect(on.hydrated).toEqual(on.server)
    expect(crawler(on.navigated.head)).toEqual(crawler(on.server.head))

    // user-visible tags still update
    expect(on.navigated.title).toBe('Page B')
    expect(on.navigated.head).toContain('<style data-hid="runtime">.runtime{content:"b"}</style>')
    expect(on.navigated.head).not.toContain('<style data-hid="runtime">.runtime{content:"a"}</style>')
  })

  it('lets a runtime entry take over crawler tags with the option off', async () => {
    const off = await run(false, true)
    expect(off.navigated.head).toContain('<meta name="description" content="B desc">')
  })

  it('keeps server crawler tags when a client plugin pushes during setup', async () => {
    const page = document.implementation.createHTMLDocument()
    page.head.innerHTML = '<meta name="description" content="From the server">'
    const head = await createBuiltClientHead(true, {
      document: page,
      plugins: [(head) => {
        head.push({ title: 'Plugin title', meta: [{ name: 'description', content: 'From the plugin' }] })
        return { key: 'startup-defaults' }
      }],
    }, createCoreClientHead)

    expect(page.title).toBe('Plugin title')
    expect(page.head.querySelector('meta[name=description]')?.getAttribute('content')).toBe('From the server')
    head.push({ title: 'New title' })
    expect(page.title).toBe('New title')
    expect(page.head.querySelector('meta[name=description]')?.getAttribute('content')).toBe('From the server')
  })
})

describe('serverOnlyCrawlerTags with streaming SSR', () => {
  it.each(['async', 'inline', 'module'] as const)('keeps server crawler tags through the %s bootstrap', (mode) => {
    const plugins = Unhead({ streaming: { mode }, serverOnlyCrawlerTags: true, devtools: false, validate: false }).vite()
    const runtime = plugins.find(p => p.name === 'unhead:server-only-crawler-tags-runtime') as any
    const transform = (source: string) => {
      const result = runtime.transform.handler.call({ environment: { config: { consumer: 'client' } } }, source, 'entry.ts')
      return bindImports(result?.code ?? source)
    }
    const streamKey = '__unhead__'
    const { head: server } = createStreamingServer({ disableDefaults: true })
    server.push({ meta: [{ name: 'description', content: 'Shell description' }] })
    const prevHead = document.head.innerHTML
    document.head.innerHTML = renderShell(server).headTags
    const streamWindow = window as Window & { __unhead__?: StreamingGlobal }
    const prevQueue = streamWindow[streamKey]
    streamWindow[streamKey] = undefined

    const modules = {
      'unhead/client': { createHead: createCoreClientHead },
      'unhead/plugins': unheadPlugins,
      'unhead/stream/client': { createStreamableHead: wrapStreamedHead },
    }
    const readMeta = (name: string) => document.head.querySelector(`meta[name="${name}"]`)?.getAttribute('content')

    // eslint-disable-next-line no-new-func
    const runScript = (code: string) => new Function('modules', 'window', 'document', code)(modules, window, document)
    const pushServerChunk = () => runScript(renderSSRHeadSuspenseChunk(server))

    try {
      if (mode === 'inline')
        initStreamingIife({ streamKey })
      streamWindow[streamKey] ??= {
        _q: [],
        push(entries) {
          this._q.push(entries)
        },
      }
      useCoreSeoMeta(server, { description: 'Queued description', themeColor: '#456' })
      pushServerChunk()

      if (mode === 'async')
        initStreamingIife({ streamKey })
      if (mode === 'module') {
        const streaming = plugins.find(p => p.name === '@unhead/vue:streaming') as any
        const { code } = streaming.load.handler.call({}, `\0${VIRTUAL_CLIENT_ID}`)
        runScript(transform(code.replace('@unhead/vue/client', 'unhead/client')))
      }

      const head = runScript(transform(`import { createStreamableHead } from 'unhead/stream/client'
return createStreamableHead()`)) as NonNullable<ReturnType<typeof wrapStreamedHead>>
      expect(readMeta('description')).toBe('Queued description')
      expect(readMeta('theme-color')).toBe('#456')

      server.push({ title: 'Streamed title', meta: [{ name: 'description', content: 'Live description' }] })
      pushServerChunk()
      expect(readMeta('description')).toBe('Live description')
      expect(document.title).toBe('Streamed title')

      const entry = head.push({ title: 'Client title', meta: [{ name: 'description', content: 'Client description' }] })
      useCoreSeoMeta(head, { description: 'Client SEO description', twitterTitle: 'Client Twitter title', themeColor: '#fff' }, { tagPriority: 'critical' })
      expect(readMeta('description')).toBe('Live description')
      expect(readMeta('twitter:title')).toBeUndefined()
      expect(readMeta('theme-color')).toBe('#fff')
      expect(document.title).toBe('Client title')

      entry.dispose()
      expect(readMeta('description')).toBe('Live description')
    }
    finally {
      streamWindow[streamKey] = prevQueue
      document.head.innerHTML = prevHead
    }
  })
})
