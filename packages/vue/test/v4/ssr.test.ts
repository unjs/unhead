import type { UseHeadInput } from '../../src/v4/types'
import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import { createHead as createV3Head, renderSSRHead as renderV3SSRHead } from '../../src/server'
import { useHead, useHeadSafe, useSeoMeta } from '../../src/v4/composables'
import { injectHead } from '../../src/v4/install'
import { TemplateParamsPlugin, useTemplateParams } from '../../src/v4/plugins'
import { createHead as createV4Head, renderSSRHead } from '../../src/v4/server'
import { ssrVueAppWithV4Head } from './util'

// a typical page: static shape, no v4-documented divergences
const typicalPage: UseHeadInput = {
  htmlAttrs: { lang: 'en', class: 'dark' },
  bodyAttrs: { class: 'antialiased' },
  title: 'Home',
  titleTemplate: '%s | Acme',
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'A typical page' },
    { property: 'og:title', content: 'Home' },
    { property: 'og:image', content: 'https://example.com/og.png' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.example.com' },
    { rel: 'stylesheet', href: '/main.css' },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'canonical', href: 'https://example.com/' },
  ],
  script: [
    { src: '/app.js', defer: true },
  ],
  style: ['.x{color:red}'],
}

describe('v4 ssr', () => {
  it('renders a typical page byte-identical to v3', async () => {
    const v3 = createV3Head({ disableDefaults: true })
    v3.push(typicalPage)
    const expected = renderV3SSRHead(v3)

    const v4 = await ssrVueAppWithV4Head(() => {
      useHead(typicalPage)
    })
    const actual = renderSSRHead(v4)

    expect(actual.htmlAttrs).toBe(expected.htmlAttrs)
    expect(actual.bodyAttrs).toBe(expected.bodyAttrs)
    expect(actual.bodyTagsOpen).toBe(expected.bodyTagsOpen)
    expect(actual.bodyTags).toBe(expected.bodyTags)
    expect(actual.headTags).toBe(expected.headTags)
  })

  it('omitLineBreaks matches v3', async () => {
    const v3 = createV3Head({ disableDefaults: true })
    v3.push(typicalPage)
    const expected = renderV3SSRHead(v3, { omitLineBreaks: true })

    const v4 = await ssrVueAppWithV4Head((head) => {
      useHead(typicalPage, { head })
    })
    expect(renderSSRHead(v4, { omitLineBreaks: true }).headTags).toBe(expected.headTags)
  })

  it('resolves refs, computeds and getters', async () => {
    const title = ref('ref title')
    const desc = computed(() => `${title.value} described`)
    const head = await ssrVueAppWithV4Head(() => {
      useHead({
        title,
        meta: [{ name: 'description', content: desc }],
        link: [{ rel: 'canonical', href: () => `https://example.com/${title.value}` }],
      })
    })
    expect(renderSSRHead(head).headTags).toMatchInlineSnapshot(`
      "<title>ref title</title>
      <meta name="description" content="ref title described">
      <link rel="canonical" href="https://example.com/ref title">"
    `)
  })

  it('async setup: refs assigned after useHead still render', async () => {
    const title = ref<string>()
    const head = await ssrVueAppWithV4Head(async () => {
      useHead({ title })
      // simulated data fetch, resolves before renderSSRHead runs
      await Promise.resolve()
      title.value = 'Fetched'
    })
    expect(renderSSRHead(head).headTags).toBe('<title>Fetched</title>')
  })

  it('resolves and patches root refs and getters at the server compile boundary', () => {
    const input = ref({ title: 'initial' })
    const head = createV4Head({ disableDefaults: true })
    const entry = useHead(input, { head })
    input.value = { title: 'before render' }
    expect(renderSSRHead(head).headTags).toBe('<title>before render</title>')

    entry.patch(() => ({ title: 'getter patch' }))
    expect(renderSSRHead(head).headTags).toBe('<title>getter patch</title>')
  })

  it('injectHead inside setup returns the provided head', async () => {
    let injected: unknown
    const head = await ssrVueAppWithV4Head(() => {
      injected = injectHead()
    })
    expect(injected).toBe(head)
  })

  it('useSeoMeta expands flat input', async () => {
    const head = await ssrVueAppWithV4Head(() => {
      useSeoMeta({
        title: 'SEO',
        description: 'flat description',
        ogTitle: 'og SEO',
        ogImage: 'https://example.com/og.png',
        twitterCard: 'summary',
        robots: { index: false, follow: true },
      })
    })
    expect(renderSSRHead(head).headTags).toMatchInlineSnapshot(`
      "<title>SEO</title>
      <meta name="description" content="flat description">
      <meta property="og:title" content="og SEO">
      <meta property="og:image" content="https://example.com/og.png">
      <meta name="twitter:card" content="summary">
      <meta name="robots" content="follow">"
    `)
  })

  it('useSeoMeta patch renormalizes flat input', async () => {
    const head = createV4Head({ disableDefaults: true })
    const entry = useSeoMeta({ description: 'a' }, { head })
    entry.patch({ description: 'b' })
    expect(renderSSRHead(head).headTags).toBe('<meta name="description" content="b">')
  })

  it('useHeadSafe strips unsafe input', async () => {
    const head = await ssrVueAppWithV4Head(() => {
      useHeadSafe({
        title: '</title><script>alert(1)</script>',
        meta: [
          { 'name': 'description', 'content': 'safe', 'data-test': 'keep' },
          { 'http-equiv': 'refresh', 'content': '0;url=https://evil.example' } as any,
        ],
        link: [
          { rel: 'canonical', href: 'https://example.com/' },
          { rel: 'icon', href: 'javascript:alert(1)' },
          { rel: 'icon', href: '/safe.ico' },
        ],
        script: [
          { innerHTML: 'alert(1)' } as any,
          { type: 'application/json', textContent: '{"ok":true,"__proto__":{"x":1}}' },
        ],
        htmlAttrs: { lang: 'en', onclick: 'alert(1)' } as any,
      })
    })
    const { headTags, htmlAttrs } = renderSSRHead(head)
    expect(htmlAttrs).toBe(' lang="en"')
    expect(headTags).toMatchInlineSnapshot(`
      "<title>&lt;&#x2F;title&gt;&lt;script&gt;alert(1)&lt;&#x2F;script&gt;</title>
      <meta name="description" content="safe" data-test="keep">
      <link rel="icon" href="/safe.ico">
      <script type="application/json">{"ok":true}</script>"
    `)
    expect(headTags).not.toContain('evil.example')
    expect(headTags).not.toContain('javascript:')
  })

  it('accepts an explicit head without injection context', () => {
    const head = createV4Head({ disableDefaults: true })
    useHead({ title: 'direct' }, { head })
    expect(renderSSRHead(head).headTags).toBe('<title>direct</title>')
  })

  it('createHead registers plugins from options (Nuxt unhead-options shape)', () => {
    const head = createV4Head({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    useTemplateParams(head, { siteName: 'Acme' })
    useHead({ title: 'Page %separator %siteName' }, { head })
    expect(renderSSRHead(head).headTags).toBe('<title>Page | Acme</title>')
  })

  it('nuxt island shape: entries expose raw input without an adapter thunk', () => {
    const head = createV4Head({ disableDefaults: true })
    const input = { title: 'island' }
    useHead(input, { head })
    const inputs = [...head.entries.values()].map(e => e.input)
    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toBe(input)
  })
})
