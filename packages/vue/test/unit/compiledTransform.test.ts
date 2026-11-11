import * as unheadVue from '@unhead/vue'
import { createHead as createClientHead } from '@unhead/vue/client'
import * as compiledRuntime from '@unhead/vue/compiled'
import { createHead as createCompiled, renderSSRHead as renderCompiled } from '@unhead/vue/compiled/server'
import { createHead as createV3, renderSSRHead as renderV3 } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import { TemplateParamsPlugin } from 'unhead/plugins'
import { describe, expect, it } from 'vitest'
import * as vue from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'
import { CompileTransform } from '../../../bundler/src/unplugin/CompileTransform'

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?$/gm
const AS_RE = /\s+as\s+/
const COMPILED_CALL_RE = /__unhead_(?:useCompiledHead|useCompiledSeoMeta|useStaticCompiledSeoMeta)\(/g

const modules = {
  '@unhead/vue': unheadVue,
  '@unhead/vue/compiled': compiledRuntime,
  'vue': vue,
} satisfies Record<string, object>

function compile(source: string, id = '/src/page.js'): string {
  const plugin = CompileTransform.vite({}) as any
  return plugin.transform.handler.call({ environment: { config: { consumer: 'server' } } }, source, id)?.code ?? source
}

// Evaluates a module whose default export is a setup function. Named imports
// resolve to the real modules.
function evaluate(code: string, globals: Record<string, unknown> = {}): (...args: any[]) => any {
  const body = code.replace(IMPORT_RE, (_, specifiers: string, source: string) => {
    const bindings = specifiers.split(',').map(s => s.trim()).filter(Boolean).map((specifier) => {
      const [imported, local = imported] = specifier.split(AS_RE)
      return `${imported}: ${local}`
    })
    return `const { ${bindings.join(', ')} } = __modules[${JSON.stringify(source)}];`
  }).replace('export default', '__exports.default =')
  const exports: Record<string, any> = {}
  // eslint-disable-next-line no-new-func
  new Function('__modules', '__exports', ...Object.keys(globals), body)(modules, exports, ...Object.values(globals))
  return exports.default
}

function attempt<T>(fn: () => T): { value: T } | { threw: string } {
  try {
    return { value: fn() }
  }
  catch (error) {
    return { threw: (error as Error).message }
  }
}

async function ssr(head: any, setup: () => void): Promise<{ threw: string } | undefined> {
  const app = vue.createSSRApp({ setup, render: () => null })
  app.use(head)
  return renderToString(app).then(() => undefined, (error: Error) => ({ threw: error.message }))
}

async function renderBoth(source: string, tp: boolean, globals: () => Record<string, unknown> = () => ({})) {
  const options = { plugins: tp ? [TemplateParamsPlugin] : [] }
  const v3 = createV3(options)
  const v3Error = await ssr(v3, () => evaluate(source, globals())())
  const compiled = createCompiled(options)
  const compiledError = await ssr(compiled, () => evaluate(compile(source), globals())())
  return {
    v3: v3Error || attempt(() => [renderV3(v3), renderV3(v3)]),
    compiled: compiledError || attempt(() => [renderCompiled(compiled), renderCompiled(compiled)]),
  }
}

const RUNTIME_VALUES: [string, string][] = [
  ['text', `'Hello'`],
  ['text with markup', `'a < b & "c"'`],
  ['template param', `'%siteName page'`],
  ['empty', `''`],
  ['true text', `'true'`],
  ['zero', `0`],
  ['number', `42`],
  ['null', `null`],
  ['undefined', `undefined`],
  ['false', `false`],
  ['true', `true`],
  ['list', `['a', 'b']`],
  ['object', `{ a: 1 }`],
]

const WRAPPERS: [string, (value: string) => string][] = [
  ['plain', value => value],
  ['ref', value => `ref(${value})`],
  ['getter', value => `() => (${value})`],
  ['computed', value => `computed(() => (${value}))`],
  // v3 unwraps a ref that a getter returns
  ['getter of a ref', value => `() => ref(${value})`],
]

const LAYOUT = `useHead({ title: 'Layout', meta: [{ name: 'description', content: 'layout' }, { property: 'og:title', content: 'layout' }], link: [{ rel: 'canonical', href: '/layout' }], htmlAttrs: { lang: 'en' } })
  useSeoMeta({ ogDescription: 'layout', twitterTitle: 'layout' })`

const POSITIONS: [string, (value: string) => string][] = [
  ['useHead title', value => `useHead({ title: ${value} })`],
  ['useHead meta content', value => `useHead({ meta: [{ name: 'description', content: ${value} }] })`],
  ['useHead link href', value => `useHead({ link: [{ rel: 'canonical', href: ${value} }] })`],
  ['useHead html lang', value => `useHead({ htmlAttrs: { lang: ${value} } })`],
  // inline content is the identity of a script, so a value there stays loose
  ['useHead script content', value => `useHead({ script: [{ innerHTML: ${value} }] })`],
  ['useHead mixed', value => `useHead({ title: 'Static', meta: [{ property: 'og:title', content: ${value} }, { name: 'robots', content: 'index' }] })`],
  ['useServerHead title', value => `useServerHead({ title: ${value} })`],
  ['useSeoMeta description', value => `useSeoMeta({ description: ${value}, ogType: 'website' })`],
  ['useSeoMeta title', value => `useSeoMeta({ title: ${value}, ogTitle: 'Static' })`],
  ['useSeoMeta og title', value => `useSeoMeta({ ogTitle: ${value}, twitterTitle: ${value} })`],
  ['useServerSeoMeta description', value => `useServerSeoMeta({ description: ${value} })`],
  ['useHead getter input', value => `useHead(() => ({ title: ${value}, meta: [{ name: 'description', content: ${value} }] }))`],
  ['useHead getter input with statements', value => `useHead(() => {
    const read = ${value}
    return { title: read, link: [{ rel: 'canonical', href: read }] }
  })`],
  ['useSeoMeta string list', value => `useSeoMeta({ articleTag: [${value}, 'static'], ogType: 'article' })`],
  ['useSeoMeta image list', value => `useSeoMeta({ ogImage: [{ url: ${value}, width: 1200 }, '/static.png'] })`],
  ['useHead getter conditional', value => `useHead(() => {
    const read = ${value}
    return read ? { link: [{ rel: 'canonical', href: read }] } : {}
  })`],
  ['useHead getter conditional key', value => `useHead(() => ({ link: (${value}) ? [{ rel: 'canonical', href: '/a' }] : [], title: 'T' }))`],
  ['useHead conditional key', value => `useHead({ link: (${value}) ? [{ rel: 'canonical', href: '/a' }] : [] })`],
]

function snippet(call: string, layout = true): string {
  return `import { useHead, useSeoMeta, useServerHead, useServerSeoMeta } from '@unhead/vue'
import { computed, ref } from 'vue'
export default function setup() {
  ${layout ? LAYOUT : ''}
  ${call}
}`
}

describe('compiled head calls render like v3', () => {
  const cases = POSITIONS.flatMap(([position, call]) => WRAPPERS.flatMap(([wrapper, wrap]) =>
    // v3 throws while it renders `undefined` or `null` in a flat meta list
    RUNTIME_VALUES.filter(([name]) => !position.includes('string list') || (name !== 'undefined' && name !== 'null'))
      .map(([name, value]) => [`${position}, ${wrapper} ${name}`, call(wrap(value)), wrapper !== 'plain' && !position.includes('script')] as const)))

  it.each(cases)('%s', async (_, call, compiles) => {
    const source = snippet(call)
    // both layout calls compile, and a dynamic value becomes a dynamic value
    expect(compile(source).match(COMPILED_CALL_RE)!.length).toBeGreaterThanOrEqual(compiles ? 3 : 2)
    for (const tp of [false, true]) {
      const { v3, compiled } = await renderBoth(source, tp)
      expect(compiled).toEqual(v3)
    }
  })

  it.each([
    ['static useHead', `useHead({
      title: 'Page',
      titleTemplate: '%s %separator %siteName',
      templateParams: { siteName: 'Site', separator: '|' },
      htmlAttrs: { lang: 'en', class: ['a', 'b'] },
      bodyAttrs: { style: { color: 'red' } },
      base: { href: '/' },
      meta: [{ charset: 'utf-8' }, { name: 'description', content: 'D' }, { property: 'og:image', content: ['/1.png', '/2.png'] }],
      link: [{ rel: 'icon', href: '/favicon.ico' }, { rel: 'preload', href: '/a.woff2', as: 'font', crossorigin: '' }],
      script: [{ src: '/a.js', defer: true, tagPriority: 'high' }, { type: 'application/ld+json', innerHTML: { '@type': 'Thing', name: 'x' } }],
      style: [{ innerHTML: 'body { color: red }' }],
      noscript: ['No JS'],
    })`],
    ['static useSeoMeta', `useSeoMeta({
      title: 'Page',
      titleTemplate: '%s | Site',
      description: 'D',
      ogImage: [{ url: '/1.png', width: 1200, height: 630, alt: 'One' }, '/2.png'],
      twitterImage: { url: '/t.png', alt: 'T' },
      robots: { index: true, follow: false, maxSnippet: -1 },
      themeColor: [{ content: 'red', media: '(prefers-color-scheme: light)' }],
      refresh: { seconds: 5, url: '/next' },
      contentSecurityPolicy: { defaultSrc: "'self'" },
      appleItunesApp: { appId: '1', appArgument: 'x' },
      charset: 'utf-8',
      ogLocaleAlternate: ['fr', 'de'],
      ogImageWidth: 100,
    })`],
    ['several calls, one bails', `const input = { title: 'Spread' }
      useHead({ ...input })
      useHead({ meta: [{ name: 'a', content: 'b' }] })
      useSeoMeta({ ogImage: ref('/dynamic.png') })
      useSeoMeta({ description: computed(() => 'D') })`],
    ['ref changed after the call', `const title = ref('before')
      const description = ref()
      useHead({ title })
      useSeoMeta({ description: () => description.value })
      title.value = 'after'
      description.value = 'set later'`],
    ['template literal values', `const slug = 'post'
      useHead({ link: [{ rel: 'canonical', href: \`https://example.com/\${slug}\` }], title: \`Post \${slug}\` })`],
    ['nested head call in a value', `useHead({ title: (useHead({ meta: [{ name: 'inner', content: 'x' }] }), 'Outer') })`],
    ['entry patch', `const entry = useHead({ title: 'First' })
      entry.patch({ title: 'Patched', meta: [{ name: 'a', content: 'b' }] })`],
    ['entry dispose', `const entry = useHead({ title: 'Gone', meta: [{ name: 'description', content: 'gone' }] })
      entry.dispose()`],
  ])('%s', async (_, call) => {
    for (const layout of [false, true]) {
      for (const tp of [false, true]) {
        const { v3, compiled } = await renderBoth(snippet(call, layout), tp)
        expect(compiled).toEqual(v3)
      }
    }
  })

  it('compiles and renders what <script setup> compiles to', async () => {
    const { descriptor } = parse(`<script setup>
import { useHead, useSeoMeta } from '@unhead/vue'
import { ref } from 'vue'
const title = ref('Hello')
useHead({ title, meta: [{ name: 'description', content: 'From SFC' }] })
useSeoMeta({ ogTitle: () => title.value, ogDescription: 'Static' })
title.value = 'Hello again'
</script>
<template><div>{{ title }}</div></template>`, { filename: 'App.vue' })
    const { content } = compileScript(descriptor, { id: 'x', inlineTemplate: true, templateOptions: { ssr: true } })
    const component = (code: string) => evaluate(code.replace(/^import .* from "vue\/server-renderer"$/m, ''), { _ssrInterpolate: String, _ssrRenderAttrs: () => '' }) as any
    expect(compile(content, '/src/App.vue').match(COMPILED_CALL_RE)).toHaveLength(2)
    const render = async (head: any, code: string) => {
      const app = vue.createSSRApp(component(code))
      app.use(head)
      await renderToString(app)
    }
    const v3 = createV3()
    await render(v3, content)
    const compiled = createCompiled()
    await render(compiled, compile(content, '/src/App.vue'))
    expect(renderCompiled(compiled)).toEqual(renderV3(v3))
    expect(renderCompiled(compiled).headTags).toContain('<title>Hello again</title>')
  })
})

// Each flat meta key that `unpackMeta` also expands from an object or a list, with a
// value of each shape: [key, text, object, list]
const OBJECT_SEO_VALUES: [string, string, string, string][] = [
  ['ogImage', `'https://e.com/a.png'`, `{ url: '/o.png', width: 1200, alt: 'O' }`, `['/1.png', { url: '/2.png', alt: 'Two' }]`],
  ['ogImageUrl', `'https://e.com/a.png'`, `{ url: '/o.png' }`, `['/1.png', '/2.png']`],
  ['ogVideo', `'https://e.com/a.mp4'`, `{ url: '/v.mp4', type: 'video/mp4' }`, `['/1.mp4', '/2.mp4']`],
  ['ogVideoUrl', `'https://e.com/a.mp4'`, `{ url: '/v.mp4' }`, `['/1.mp4', '/2.mp4']`],
  ['ogAudio', `'https://e.com/a.mp3'`, `{ url: '/a.mp3', secureUrl: 'https://e.com/a.mp3' }`, `['/1.mp3', '/2.mp3']`],
  ['ogAudioUrl', `'https://e.com/a.mp3'`, `{ url: '/a.mp3' }`, `['/1.mp3', '/2.mp3']`],
  ['twitterImage', `'https://e.com/t.png'`, `{ url: '/t.png', alt: 'T' }`, `['/1.png', '/2.png']`],
  ['themeColor', `'#ffffff'`, `{ content: 'red', media: 'print' }`, `[{ content: 'red', media: '(prefers-color-scheme: light)' }, 'blue']`],
  ['googleSiteVerification', `'abc'`, `{ content: 'abc' }`, `['a', 'b']`],
  ['author', `'Ada'`, `{ content: 'Ada' }`, `['Ada', 'Grace']`],
  ['ogLocaleAlternate', `'fr_FR'`, `{ content: 'fr_FR' }`, `['fr_FR', 'de_DE']`],
  ['articleAuthor', `'Ada'`, `{ content: 'Ada' }`, `['Ada', 'Grace']`],
  ['articleTag', `'vue'`, `{ content: 'vue' }`, `['vue', 'nuxt']`],
  ['bookAuthor', `'Ada'`, `{ content: 'Ada' }`, `['Ada', 'Grace']`],
  ['bookTag', `'vue'`, `{ content: 'vue' }`, `['vue', 'nuxt']`],
  ['robots', `'noindex, nofollow'`, `{ index: true, follow: false, maxSnippet: -1 }`, `['noindex', 'nofollow']`],
  ['refresh', `'5;url=/next'`, `{ seconds: 5, url: '/next' }`, `['5', '10']`],
  ['contentSecurityPolicy', `"default-src 'self'"`, `{ defaultSrc: "'self'", imgSrc: '*' }`, `["default-src 'self'", 'img-src *']`],
  ['appleItunesApp', `'app-id=1'`, `{ appId: '1', appArgument: 'x' }`, `['app-id=1', 'app-id=2']`],
]

describe('a dynamic value of an object-capable seo key renders like v3', () => {
  const pick = () => ({ pick: (value: unknown) => value })
  const valueWrappers: [string, (value: string) => string][] = [...WRAPPERS.slice(1), ['call', value => `pick(${value})`]]
  const cases = OBJECT_SEO_VALUES.flatMap(([key, text, object, list]) => valueWrappers.flatMap(([wrapper, wrap]) => [
    ['text', text],
    ['object', object],
    ['list', list],
    ['undefined', 'undefined'],
    ['null', 'null'],
    ['empty', `''`],
  ].map(([name, value]) => [`${key}, ${wrapper} ${name}`, key, wrap(value!)] as const)))

  it.each(cases)('%s', async (_, key, value) => {
    // the layout sets the same key, so a page value that renders no tag must not hide it
    const source = snippet(`useSeoMeta({ ${key}: 'layout', ogTitle: 'Layout' })
  useSeoMeta({ ${key}: ${value}, description: 'Page' })`, false)
    expect(compile(source).match(COMPILED_CALL_RE)).toEqual(['__unhead_useStaticCompiledSeoMeta(', '__unhead_useCompiledSeoMeta('])
    for (const tp of [false, true]) {
      const { v3, compiled } = await renderBoth(source, tp, pick)
      expect(compiled).toEqual(v3)
    }
  })
})

describe('compiled values keep v3 evaluation', () => {
  it('evaluates a value expression once at the call, and a getter once at render', async () => {
    const counts: { expression: number, getter: number }[] = []
    const globals = () => {
      const count = { expression: 0, getter: 0 }
      counts.push(count)
      return {
        count: () => `expression ${++count.expression}`,
        read: () => `getter ${++count.getter}`,
      }
    }
    const source = snippet(`useHead({ title: count(), meta: [{ name: 'description', content: () => read() }] })`, false)
    const { v3, compiled } = await renderBoth(source, false, globals)
    expect(compiled).toEqual(v3)
    expect(counts).toEqual([{ expression: 1, getter: 1 }, { expression: 1, getter: 1 }])
    expect((compiled as any).value[0].headTags).toContain('<title>expression 1</title>')
  })

  it('evaluates a throwing value once and throws from setup as v3 does', async () => {
    let calls = 0
    const globals = () => ({
      boom: () => {
        calls++
        throw new Error('boom')
      },
    })
    const { v3, compiled } = await renderBoth(snippet(`useHead({ title: boom() })`, false), false, globals)
    expect(compiled).toEqual(v3)
    expect(v3).toEqual({ threw: 'boom' })
    expect(calls).toBe(2)
  })

  it('throws a getter error from the render as v3 does', async () => {
    const { v3, compiled } = await renderBoth(snippet(`useHead({ title: () => { throw new Error('late') } })`, false), false)
    expect(compiled).toEqual(v3)
    expect(v3).toEqual({ threw: 'late' })
  })

  it('keeps a plain value non-reactive', async () => {
    const source = snippet(`const route = { name: 'first' }
      useHead({ title: route.name })
      route.name = 'second'`, false)
    const { v3, compiled } = await renderBoth(source, false)
    expect(compiled).toEqual(v3)
    expect((compiled as any).value[0].headTags).toContain('<title>first</title>')
  })
})

describe('useCompiledHead', () => {
  const compiledTags: any = [['title', 0, 10, 'title', { textContent: 'A' }, 1]]

  it('renders a compiled useHead beside loose calls', async () => {
    const source = snippet(`const title = ref('a')
      useHead({ title, meta: [{ name: 'description', content: () => 'D' }] })
      useSeoMeta({ ogTitle: 'O' })
      title.value = 'b'`, false)
    const v3 = createV3({ disableDefaults: true })
    await ssr(v3, evaluate(source))
    const head = createCompiled({ disableDefaults: true })
    expect(await ssr(head, evaluate(compile(source)))).toBeUndefined()
    expect(renderCompiled(head)).toEqual(renderV3(v3))
    expect(renderCompiled(head).headTags).toContain('<title>b</title>')
  })

  it.each([
    ['a v3 server head', () => createV3()],
    ['a client head', () => createClientHead()],
  ])('refuses %s and names the fix', async (_, create) => {
    expect(await ssr(create(), () => compiledRuntime.useCompiledHead(compiledTags))).toEqual({
      threw: '[unhead] This head cannot take compiled tags. Create it with createHead() from @unhead/vue/compiled/server or createLazyHead() from @unhead/vue/lazy. Or set compile: false in the Unhead plugin.',
    })
  })

  it('returns the active entry', () => {
    const head = createCompiled({ disableDefaults: true })
    const entry = compiledRuntime.useCompiledHead(compiledTags, undefined, { head })
    entry.patch({ title: 'B' })
    expect(renderCompiled(head).headTags).toBe('<title>B</title>')
    entry.dispose()
    expect(renderCompiled(head).headTags).toBe('')
  })
})
