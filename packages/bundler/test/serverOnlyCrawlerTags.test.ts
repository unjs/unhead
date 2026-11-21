import type { RspackCompiler, WebpackCompiler } from 'unplugin'
import { isCrawlerTag, normalizeEntryToTags } from 'unhead/utils'
import { describe, expect, it } from 'vitest'
import { createFrameworkPlugin } from '../src/unplugin/framework'
import { ServerOnlyCrawlerTags, ServerOnlyCrawlerTagsRuntime } from '../src/unplugin/ServerOnlyCrawlerTags'
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
function calls(code: string | undefined): { name: string, input: unknown }[] {
  // `new Function(undefined)` runs nothing, which would pass for a transform that changed nothing.
  if (code === undefined)
    throw new Error('the transform left the code unchanged')
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

/** Runs `code` through the runtime plugin, then evaluates it and returns the inputs each `createHead()` received. */
async function runRuntime(code: string, consumer: 'client' | 'server' = 'client') {
  const res = await runTransform(ServerOnlyCrawlerTagsRuntime.vite({}) as any, code, 'node_modules/@unhead/vue/dist/client.mjs', env(consumer))
  return runtimeCalls(res?.code ?? code)
}

function runtimeCalls(code: string) {
  const out = code
    .replace(/import \{([^}]+)\} from '([^']+)';?/g, (_: string, names: string, source: string) => `const {${names.replace(/ as /g, ': ')}} = modules[${JSON.stringify(source)}];`)
    .replace(/import \* as (\w+) from '([^']+)';?/g, (_: string, name: string, source: string) => `const ${name} = modules[${JSON.stringify(source)}];`)
  const received: any[] = []
  // eslint-disable-next-line no-new-func
  new Function('modules', out)({
    'unhead/client': { createHead: (o: any) => received.push(o) },
    'unhead/stream/client': { createStreamableHead: (o: unknown) => received.push(o) },
    '@unhead/react/stream/client': { createStreamableHead: (o: unknown) => received.push(o) },
    '@unhead/solid-js/stream/client': { createStreamableHead: (o: unknown) => received.push(o) },
    '@unhead/svelte/stream/client': { createStreamableHead: (o: unknown) => received.push(o) },
    'unhead/plugins': { ServerOnlyCrawlerTagsPlugin: 'crawler' },
    'other': { createHead: (o: any) => received.push(o) },
  })
  return received
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
    expect(calls(code)).toEqual([{ name: 'useSeoMeta', input: { title: 'Home', titleTemplate: '%s | Site', themeColor: '#fff', colorScheme: 'dark' } }])
  })

  it('removes a useSeoMeta call left with no keys', async () => {
    const code = await transform(`useSeoMeta({ description: 'Desc', ogTitle: computed(() => 'x'), twitterTitle: \`T \${1}\` })`)
    expect(calls(code)).toEqual([])
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
    expect(calls(code)).toEqual([{
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
    expect(calls(code)).toEqual([{ name: 'useHead', input: { title: 'Home' } }])
  })

  it.each([
    ['script', `{ src: '/suppressed.js' }`, `{ type: 'application/ld+json', innerHTML: '{}' }`],
    ['meta', `{ name: 'theme-color', content: '#fff' }`, `{ name: 'description', content: 'Desc' }`],
    ['link', `{ rel: 'stylesheet', href: '/suppressed.css' }`, `{ rel: 'canonical', href: '/' }`],
  ])('keeps the empty %s override over spread and duplicate defaults', async (key, browserTag, crawlerTag) => {
    const code = await transform(`const base = { ${key}: [${browserTag}] }
      useHead({ ...base, ${key}: [${crawlerTag}] })
      useHead({ ${key}: [${browserTag}], ${key}: [${crawlerTag}] })
      const key = '${key}'
      useHead(() => ({ [key]: [${browserTag}], ${key}: [${crawlerTag}], }))`)
    expect(calls(code)).toEqual(Array.from({ length: 3 }, () => ({ name: 'useHead', input: { [key]: [] } })))
  })

  it('keeps several empty overrides and evaluates spread getters once', async () => {
    const code = await transform(`let reads = 0
      const base = {
        get script() { reads++; return [{ src: '/suppressed.js' }] },
        meta: [{ name: 'theme-color', content: '#fff' }],
        link: [{ rel: 'stylesheet', href: '/suppressed.css' }],
      }
      useHeadSafe(() => ({
        ...base,
        script: [{ type: 'application/ld+json', innerHTML: '{}' },],
        meta: [{ name: 'description', content: 'Desc' }],
        link: [{ rel: 'canonical', href: '/' }],
      }))
      useHead({ title: String(reads) })`)
    expect(calls(code)).toEqual([
      { name: 'useHeadSafe', input: { script: [], meta: [], link: [] } },
      { name: 'useHead', input: { title: '1' } },
    ])
  })

  it('keeps an empty own override when a prototype supplies the tag list', async () => {
    const code = await transform(`useHead({
      script: [{ type: 'application/ld+json', innerHTML: '{}' }],
      __proto__: { script: [{ src: '/suppressed.js' }] },
    })`)
    expect(calls(code).map(call => normalizeEntryToTags(call.input, []))).toEqual([[]])
  })

  it.each([
    ['script type', 'script', `{ type: 'application/ld+json', TYPE: 'text/javascript', innerHTML: 'boot()' }`, { type: 'text/javascript' }],
    ['meta name', 'meta', `{ name: 'description', NAME: 'theme-color', content: '#fff' }`, { name: 'theme-color', content: '#fff' }],
    ['meta property', 'meta', `{ property: 'og:title', PROPERTY: 'browser', content: 'value' }`, { property: 'browser', content: 'value' }],
    ['meta name fallback', 'meta', `{ property: 'og:title', NAME: 'theme-color', content: '#fff' }`, { property: 'og:title', name: 'theme-color', content: '#fff' }],
    ['link rel', 'link', `{ rel: 'canonical', REL: 'stylesheet', href: '/a.css' }`, { rel: 'stylesheet', href: '/a.css' }],
    ['link hreflang', 'link', `{ rel: 'alternate', hreflang: 'en', hrefLang: null, href: '/feed' }`, { rel: 'alternate', hreflang: null, href: '/feed' }],
    ['inherited script type', 'script', `{ type: 'application/ld+json', __proto__: { TYPE: 'text/javascript' }, innerHTML: 'boot()' }`, { type: 'text/javascript' }],
  ])('keeps browser tags after normalization of %s', async (_label, key, tag, props) => {
    const code = await transform(`useHead({ ${key}: [${tag}] })
      useSeoMeta({ description: 'Remove this crawler tag' })`)
    const tags = calls(code).flatMap(call => normalizeEntryToTags(call.input, []))
    expect(tags.map(tag => ({ tag: tag.tag, props: tag.props }))).toEqual([{ tag: key, props }])
    expect(tags.map(tag => tag.innerHTML)).toEqual([key === 'script' ? 'boot()' : undefined])
    expect(tags.map(isCrawlerTag)).toEqual([false])
  })

  it('ignores an undefined attribute while preserving the browser identity', async () => {
    const code = await transform(`useHead({ meta: [{ name: 'theme-color', NAME: undefined, property: 'og:title', content: '#fff' }] })
      useSeoMeta({ description: 'Remove this crawler tag' })`)
    const tags = calls(code).flatMap(call => normalizeEntryToTags(call.input, []))
    expect(tags.map(tag => tag.props)).toEqual([{ name: 'theme-color', property: 'og:title', content: '#fff' }])
    expect(tags.map(isCrawlerTag)).toEqual([false])
  })

  it('removes crawler tags at the end of a list that has a trailing comma', async () => {
    const code = await transform(`useHead({
      meta: [
        { name: 'theme-color', content: '#fff' },
        { name: 'description', content: 'Desc' },
        { property: 'og:title', content: 'Home' },
      ],
    })
    useSeoMeta({
      title: 'Home',
      description: 'Desc',
      ogTitle: 'Home',
    })`)
    expect(calls(code)).toEqual([
      { name: 'useHead', input: { meta: [{ name: 'theme-color', content: '#fff' }] } },
      { name: 'useSeoMeta', input: { title: 'Home' } },
    ])
  })

  it('removes every key of a used call whose input has a trailing comma', async () => {
    const code = await transform(`globalThis.__a = useSeoMeta({ ogTitle: 'x', })
    globalThis.__b = useSeoMeta({
      description: 'Desc',
      ogTitle: 'x', // a note
    })
    globalThis.__c = useHead({ meta: [{ name: 'description', content: 'Desc' }], link: [{ rel: 'canonical', href: '/' }], })`)
    expect(calls(code)).toEqual([
      { name: 'useSeoMeta', input: {} },
      { name: 'useSeoMeta', input: {} },
      { name: 'useHead', input: {} },
    ])
  })

  it('keeps an empty call whose options can hold a render callback', async () => {
    const code = await transform(`const options = {}
    useHead({ meta: [{ property: 'og:title', content: 'x' }] }, { onRendered() {} })
    useSeoMeta({ ogTitle: 'x' }, { onRendered: () => {} })
    useSeoMeta({ ogTitle: 'x' }, { __proto__: { onRendered() {} } })
    useHead({ link: [{ rel: 'canonical', href: '/' }] }, options)`)
    expect(calls(code)).toEqual([
      { name: 'useHead', input: {} },
      { name: 'useSeoMeta', input: {} },
      { name: 'useSeoMeta', input: {} },
      { name: 'useHead', input: {} },
    ])
  })

  it('reads the input of a core composable after its head', async () => {
    const code = await transform(`import { useHead, useSeoMeta } from 'unhead'
useHead(head, { title: 'Home', meta: [{ name: 'description', content: 'Desc' }] })
useSeoMeta(head, { ogTitle: 'Home' })
useSeoMeta(head, { ogTitle: 'Home' }, { onRendered() {} })`)
    expect(code).toBe(`import { useHead, useSeoMeta } from 'unhead'
useHead(head, { title: 'Home' })
;
useSeoMeta(head, { }, { onRendered() {} })`)
  })

  it('removes a useHead call left empty, including a getter input', async () => {
    const code = await transform(`useHead({ meta: [{ property: 'og:title', content: 'x' }] })
useHeadSafe(() => ({ link: [{ rel: 'canonical', href: '/' }] }))
useHead({ script: [{ type: 'application/ld+json', innerHTML: '{}' }] }, { tagPriority: 'low' })
useHead({ script: [{ type: 'application/ld+json', innerHTML: JSON.stringify({ '@type': 'WebSite' }) }] })`)
    expect(calls(code)).toEqual([])
  })

  it('removes getters, variables, and Vue computed values, which run no code when removed', async () => {
    const code = await transform(`import { computed as c } from 'vue'
useSeoMeta({ ogTitle: () => post.value.title, ogDescription: c(() => post.value.d), ogUrl: url, twitterTitle: 'a' + 1 })`)
    expect(code).toBe(`import { computed as c } from 'vue'\n;`)
  })

  it('keeps a call whose result is used, with the crawler tags removed', async () => {
    const code = await transform(`globalThis.__entry = useSeoMeta({ ogTitle: 'x' })`)
    expect(calls(code)).toEqual([{ name: 'useSeoMeta', input: {} }])
  })

  it.each([
    ['a dynamic input', `useHead(input)`],
    ['a dynamic tag list', `useHead({ meta: computed(() => [{ name: 'description', content: 'x' }]) })`],
    ['a dynamic meta name', `useHead({ meta: [{ name: key, content: 'x' }] })`],
    ['a dynamic meta name beside a crawler property', `useHead({ meta: [{ name: key, property: 'og:title', content: 'x' }] })`],
    ['a dynamic hreflang', `useHead({ link: [{ rel: 'alternate', hreflang: lang, href: '/feed' }] })`],
    ['a spread in a tag', `useHead({ meta: [{ name: 'description', ...rest }] })`],
    ['a value with a side effect', `useHead({ meta: [{ name: 'description', content: sideEffect() }] })`],
    ['a useSeoMeta value with a side effect', `useSeoMeta({ description: sideEffect() })`],
    ['a property read, which can run a getter', `useSeoMeta({ ogTitle: page.title })`],
    ['an optional property read', `useSeoMeta({ ogTitle: page?.title })`],
    ['a local function named like a reactivity helper', `function ref(v) { sideEffect(); return v }\nuseSeoMeta({ ogTitle: ref('x') })`],
    ['a reactivity helper from another package', `import { computed } from 'other-lib'\nuseSeoMeta({ ogTitle: computed(() => 'x') })`],
    ['a Vue ref of a variable, which reads the variable', `import { ref } from 'vue'\nuseSeoMeta({ ogTitle: ref(page) })`],
    ['a Vue computed of a variable, which can read its get key', `import { computed } from 'vue'\nuseSeoMeta({ ogTitle: computed(title) })`],
    ['a duplicate key whose first value has a side effect', `useHead({ meta: [{ name: 'description', content: sideEffect(), content: 'x' }] })`],
    ['a translation call', `useSeoMeta({ ogTitle: t('og.title') })`],
    ['toValue(), which calls a getter', `useSeoMeta({ ogTitle: toValue(getTitle) })`],
    ['JSON.stringify() of a variable, which can reach toJSON()', `useHead({ script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(schema) }] })`],
    ['a template literal with a variable, which can call toString()', `useSeoMeta({ ogTitle: \`\${page} | Site\` })`],
    ['a getter in a tag', `useHead({ meta: [{ name: 'description', get content() { return sideEffect() } }] })`],
    ['a spread in a value', `useSeoMeta({ ogImage: { ...image } })`],
    ['a computed useSeoMeta key', `useSeoMeta({ [key]: 'x' })`],
    ['no crawler tags', `useHead({ title: 'x', meta: [{ name: 'theme-color', content: '#fff' }] })`],
    ['a link rel=alternate without hreflang', `useHead({ link: [{ rel: 'alternate', href: '/feed' }] })`],
    ['a tag list that starts with a hole', `useHead({ meta: [, { name: 'description', content: 'x' }] })`],
    ['a tag list with a hole after a crawler tag', `useHead({ meta: [{ name: 'description', content: 'x' }, , { name: 'theme-color', content: '#fff' }] })`],
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
    const res = await runTransform(ServerOnlyCrawlerTags.vite({}) as any, `useSeoMeta({ ogTitle: 'x' })`, 'page.ts', {})
    expect(res).toBeUndefined()
  })

  describe.each(['webpack', 'rspack'] as const)('%s compiler', (framework) => {
    it.each([
      { target: 'node', strips: false },
      { target: 'webworker', strips: false },
      { target: ['web', 'node'], strips: false },
      { target: 'browserslist', strips: false },
      { name: 'server', target: 'web', strips: false },
      { name: 'client', target: 'browserslist', strips: true },
      { target: 'web', strips: true },
      { target: ['web', 'es2020'], strips: true },
    ])('preserves crawler tags unless $name / $target selects a browser build', async ({ name, target, strips }) => {
      const source = `useSeoMeta({ title: 'Page', description: 'Server description' })`
      const clientEntry = `import { createHead } from 'unhead/client'\ncreateHead()`
      const transformForCompiler = async (factory: typeof ServerOnlyCrawlerTags | typeof ServerOnlyCrawlerTagsRuntime, code: string) => {
        const options = { name, target }
        const versions = {}
        const compiler = { name, options }
        const plugin = framework === 'webpack'
          ? factory.raw({}, { framework, versions, webpack: { compiler: compiler as WebpackCompiler } })
          : factory.raw({}, { framework, versions, rspack: { compiler: compiler as RspackCompiler } })
        if (framework === 'webpack')
          plugin.webpack?.(compiler as WebpackCompiler)
        else
          plugin.rspack?.(compiler as RspackCompiler)
        const res = await runTransform(plugin, code, 'page.js')
        return res?.code ?? code
      }

      expect(calls(await transformForCompiler(ServerOnlyCrawlerTags, source))).toEqual([{
        name: 'useSeoMeta',
        input: strips ? { title: 'Page' } : { title: 'Page', description: 'Server description' },
      }])
      expect(runtimeCalls(await transformForCompiler(ServerOnlyCrawlerTagsRuntime, clientEntry)))
        .toEqual([strips ? { plugins: ['crawler'] } : undefined])
    })
  })

  it('follows aliased imports and ignores local functions with the same name', async () => {
    const aliased = await transform(`import { useSeoMeta as seo } from '@unhead/vue'\nseo({ title: 'x', ogTitle: 'x' })`)
    expect(aliased).not.toContain('ogTitle')
    expect(await transform(`function useSeoMeta(i) {}\nuseSeoMeta({ ogTitle: 'x' })`)).toBeUndefined()
    expect(await transform(`import { useSeoMeta } from 'other-lib'\nuseSeoMeta({ ogTitle: 'x' })`)).toBeUndefined()
    const nuxt = await transform(`import { useSeoMeta } from '#app/composables/head'\nuseSeoMeta({ ogTitle: 'x' })`)
    expect(nuxt).not.toContain('ogTitle')
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
  })

  it('adds the crawler tag plugin to every client createHead() from unhead/client', async () => {
    expect(await runRuntime(`import { createHead } from 'unhead/client'\ncreateHead()`)).toEqual([{ plugins: ['crawler'] }])
    expect(await runRuntime(`import { createHead as _c } from 'unhead/client'\nconst options = { plugins: ['own'] }\n_c({ render: 1, ...options })`))
      .toEqual([{ render: 1, plugins: ['crawler', 'own'] }])
    expect(await runRuntime(`import { createHead } from 'unhead/client'\ncreateHead({ document: 1 })`, 'server')).toEqual([{ document: 1 }])
    expect(await runRuntime(`import { createHead } from 'other'\ncreateHead({ document: 1 })`)).toEqual([{ document: 1 }])
  })

  it('adds the crawler tag plugin to createHead() called through a namespace import', async () => {
    expect(await runRuntime(`import * as unhead from 'unhead/client'\nunhead.createHead({ document: 1 })`))
      .toEqual([{ document: 1, plugins: ['crawler'] }])
  })

  it.each(['unhead', '@unhead/react', '@unhead/solid-js', '@unhead/svelte'])('installs the filter on the %s stream client', async (framework) => {
    expect(await runRuntime(`import { createStreamableHead as createHead } from '${framework}/stream/client'
createHead({ streamKey: 'custom' })`)).toEqual([{ streamKey: 'custom', plugins: ['crawler'] }])
  })

  it('keeps the input of a local function that shadows the imported createHead()', async () => {
    expect(await runRuntime(`import { createHead } from 'unhead/client'\nfunction make(createHead) { createHead({ document: 1 }) }\nmake(modules.other.createHead)`))
      .toEqual([{ document: 1 }])
  })
})
