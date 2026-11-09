import { describe, expect, it } from 'vitest'
import { createFrameworkPlugin } from '../src/unplugin/framework'
import { ServerOnlyCrawlerTags } from '../src/unplugin/ServerOnlyCrawlerTags'
import { Unhead } from '../src/unplugin/vite'
import { runTransform } from './utils'

const PLUGIN_NAME = 'unhead:server-only-crawler-tags'

function env(consumer: 'client' | 'server') {
  return { environment: { config: { consumer } } }
}

async function transform(code: string, consumer: 'client' | 'server' = 'client', id = 'page.ts', options = {}) {
  const res = await runTransform(ServerOnlyCrawlerTags.vite(options) as any, code, id, env(consumer))
  return res?.code as string | undefined
}

/** Evaluates `code` with recording `useHead` and `useSeoMeta` stubs and returns the inputs they received. */
function calls(code: string): { name: string, input: unknown }[] {
  const out: { name: string, input: unknown }[] = []
  const record = (name: string) => (input: unknown) => {
    out.push({ name, input: typeof input === 'function' ? input() : input })
    return { name }
  }
  // eslint-disable-next-line no-new-func
  new Function('useHead', 'useHeadSafe', 'useSeoMeta', 'computed', 'sideEffect', code)(
    record('useHead'),
    record('useHeadSafe'),
    record('useSeoMeta'),
    (fn: () => unknown) => fn(),
    () => 'side',
  )
  return out
}

describe('serverOnlyCrawlerTags', () => {
  it('removes crawler keys from useSeoMeta and keeps the rest', async () => {
    const code = await transform(`useSeoMeta({
      title: 'Home',
      titleTemplate: '%s | Site',
      description: 'Desc',
      ogTitle: 'Home',
      ogImage: { url: '/og.png', width: 1200 },
      twitterCard: 'summary_large_image',
      articleAuthor: ['a'],
      robots: { index: true },
      keywords: 'a, b',
      themeColor: '#fff',
      colorScheme: 'dark',
    })`)
    expect(calls(code!)).toEqual([{ name: 'useSeoMeta', input: { title: 'Home', titleTemplate: '%s | Site', themeColor: '#fff', colorScheme: 'dark' } }])
  })

  it('removes a useSeoMeta call left with no keys', async () => {
    const code = await transform(`useSeoMeta({ description: 'Desc', ogTitle: computed(() => 'x'), twitterTitle: \`T \${1}\` })`)
    expect(calls(code!)).toEqual([])
  })

  it('removes crawler tags from useHead and keeps the rest', async () => {
    const code = await transform(`useHead({
      title: 'Home',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'description', content: 'Desc' },
        { property: 'og:title', content: 'Home' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'ROBOTS', content: 'noindex' },
        { name: 'theme-color', content: '#fff' },
        { name: 'viewport', content: 'width=device-width' },
      ],
      link: [
        { rel: 'canonical', href: '/' },
        { rel: 'alternate', hreflang: 'de', href: '/de' },
        { rel: 'alternate', type: 'application/rss+xml', href: '/rss.xml' },
        { rel: 'stylesheet', href: '/a.css' },
      ],
      script: [
        { type: 'application/ld+json', innerHTML: '{}' },
        { src: '/app.js' },
      ],
    })`)
    expect(calls(code!)).toEqual([{
      name: 'useHead',
      input: {
        title: 'Home',
        htmlAttrs: { lang: 'en' },
        meta: [{ name: 'theme-color', content: '#fff' }, { name: 'viewport', content: 'width=device-width' }],
        link: [{ rel: 'alternate', type: 'application/rss+xml', href: '/rss.xml' }, { rel: 'stylesheet', href: '/a.css' }],
        script: [{ src: '/app.js' }],
      },
    }])
  })

  it('drops a tag type whose tags are all crawler tags', async () => {
    const code = await transform(`useHead({ title: 'Home', meta: [{ name: 'description', content: 'Desc' }], link: [{ rel: 'canonical', href: '/' },] })`)
    expect(calls(code!)).toEqual([{ name: 'useHead', input: { title: 'Home' } }])
  })

  it('removes a useHead call left empty, including a getter input', async () => {
    const code = await transform(`useHead({ meta: [{ property: 'og:title', content: 'x' }] })
useHeadSafe(() => ({ link: [{ rel: 'canonical', href: '/' }] }))
useHead({ script: [{ type: 'application/ld+json', innerHTML: '{}' }] }, { tagPriority: 'low' })`)
    expect(calls(code!)).toEqual([])
  })

  it('keeps a call whose result is used, with the crawler tags removed', async () => {
    const code = await transform(`globalThis.__entry = useSeoMeta({ ogTitle: 'x' })`)
    expect(calls(code!)).toEqual([{ name: 'useSeoMeta', input: {} }])
  })

  it.each([
    ['a dynamic input', `useHead(input)`],
    ['a dynamic tag list', `useHead({ meta: computed(() => [{ name: 'description', content: 'x' }]) })`],
    ['a dynamic meta name', `useHead({ meta: [{ name: key, content: 'x' }] })`],
    ['a spread in a tag', `useHead({ meta: [{ name: 'description', ...rest }] })`],
    ['a value with a side effect', `useHead({ meta: [{ name: 'description', content: sideEffect() }] })`],
    ['a useSeoMeta value with a side effect', `useSeoMeta({ description: sideEffect() })`],
    ['a computed useSeoMeta key', `useSeoMeta({ [key]: 'x' })`],
    ['no crawler tags', `useHead({ title: 'x', meta: [{ name: 'theme-color', content: '#fff' }] })`],
    ['a link rel=alternate without hreflang', `useHead({ link: [{ rel: 'alternate', href: '/feed' }] })`],
  ])('keeps %s as written', async (_label, source) => {
    expect(await transform(source)).toBeUndefined()
  })

  it('keeps spread useSeoMeta input and removes explicit crawler keys beside it', async () => {
    const code = await transform(`useSeoMeta({ ...base, ogTitle: 'x' })`)
    expect(code).toContain('...base')
    expect(code).not.toContain('ogTitle')
  })

  it('changes nothing in server builds', async () => {
    expect(await transform(`useSeoMeta({ title: 'x', ogTitle: 'x' })`, 'server')).toBeUndefined()
  })

  it('changes nothing for an unknown build target', async () => {
    const res = await runTransform(ServerOnlyCrawlerTags.vite() as any, `useSeoMeta({ ogTitle: 'x' })`, 'page.ts', {})
    expect(res).toBeUndefined()
  })

  it('follows aliased imports and ignores local functions with the same name', async () => {
    const aliased = await transform(`import { useSeoMeta as seo } from '@unhead/vue'\nseo({ title: 'x', ogTitle: 'x' })`)
    expect(aliased).not.toContain('ogTitle')
    expect(await transform(`function useSeoMeta(i) {}\nuseSeoMeta({ ogTitle: 'x' })`)).toBeUndefined()
    expect(await transform(`import { useSeoMeta } from 'other-lib'\nuseSeoMeta({ ogTitle: 'x' })`)).toBeUndefined()
    const custom = await transform(`import { useSeoMeta } from '#app'\nuseSeoMeta({ ogTitle: 'x' })`, 'client', 'page.ts', { importPaths: ['#app'] })
    expect(custom).not.toContain('ogTitle')
  })

  it('transforms Vue script blocks and skips other Vue blocks', async () => {
    const source = `useSeoMeta({ title: 'x', ogTitle: 'x' })`
    expect(await transform(source, 'client', 'Page.vue?vue&type=script&setup=true&lang.ts')).not.toContain('ogTitle')
    expect(await transform(source, 'client', 'Page.vue?vue&type=style&index=0&lang.css')).toBeUndefined()
  })

  it('is off by default and on when enabled, before the useSeoMeta transform', () => {
    const names = (plugins: any[]) => plugins.map(p => p.name)
    expect(names(Unhead({ devtools: false }))).not.toContain(PLUGIN_NAME)
    const on = names(Unhead({ devtools: false, serverOnlyCrawlerTags: true }))
    expect(on.indexOf(PLUGIN_NAME)).toBeGreaterThan(-1)
    expect(on.indexOf(PLUGIN_NAME)).toBeLessThan(on.indexOf('unhead:use-seo-meta-transform'))

    const factory = createFrameworkPlugin({ framework: '@unhead/vue', streamingPlugin: { vite: () => [] } as any })
    expect(names(factory({ devtools: false }).vite())).not.toContain(PLUGIN_NAME)
    expect(names(factory({ devtools: false, serverOnlyCrawlerTags: true }).vite())).toContain(PLUGIN_NAME)
    // webpack plugin instances carry no name: one more plugin when enabled
    expect(factory({ serverOnlyCrawlerTags: true }).webpack().length).toBe(factory().webpack().length + 1)
  })
})
