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

async function run(serverOnlyCrawlerTags: boolean) {
  // SSR page A with the server build
  const serverHead = createServerHead({ disableDefaults: true })
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
  clientApp.use(createClientHead({ document }))
  clientApp.mount('#app')
  await settle()
  const hydrated = snapshot()

  current.value = 'b'
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
})
