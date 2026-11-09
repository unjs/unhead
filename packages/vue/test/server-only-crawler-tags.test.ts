// @vitest-environment jsdom
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
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
  // The bundler option defines this constant for the whole build.
  ;(globalThis as any).__UNHEAD_SERVER_ONLY_CRAWLER_TAGS__ = serverOnlyCrawlerTags
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
  const clientHead = createClientHead({ document })
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
  delete (globalThis as any).__UNHEAD_SERVER_ONLY_CRAWLER_TAGS__
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
})
