/**
 * v4 L2 compat surface: useSeoMeta + the three v3 plugins ported to resolve
 * slots. Every case renders the same input through v3 and v4 and asserts the
 * SSR payloads match; every plugin also gets a repeated-render stability test
 * (entry tag caches are shared across renders and must never be mutated).
 */
import { describe, expect, it, vi } from 'vitest'
import { useSeoMeta as useSeoMetaV3 } from '../packages/unhead/src'
import {
  CanonicalPlugin as CanonicalPluginV3,
  InferSeoMetaPlugin as InferSeoMetaPluginV3,
  TemplateParamsPlugin as TemplateParamsPluginV3,
} from '../packages/unhead/src/plugins'
import { createHead as createV3, renderSSRHead as renderV3 } from '../packages/unhead/src/server'
import {
  CanonicalPlugin,
  InferSeoMetaPlugin,
  TemplateParamsPlugin,
  useTemplateParams,
} from '../packages/unhead/src/v4/plugins'
import { unpackSeoMetaInput, useSeoMeta } from '../packages/unhead/src/v4/seo'
import { createHead as createV4, renderSSRHead as renderV4 } from '../packages/unhead/src/v4/server'

function v3Seo(input: Record<string, any>) {
  const head = createV3({ disableDefaults: true })
  useSeoMetaV3(head, input)
  return renderV3(head, { omitLineBreaks: true })
}

function v4Seo(input: Record<string, any>) {
  const head = createV4({ disableDefaults: true })
  useSeoMeta(head, input)
  return renderV4(head)
}

function expectSeoParity(input: Record<string, any>) {
  const a = v3Seo(input)
  const b = v4Seo(input)
  expect(b.headTags).toBe(a.headTags)
  expect(b).toEqual({ ...a })
}

describe('v4 useSeoMeta parity with v3', () => {
  it('og/twitter basics with title + titleTemplate passthrough', () => {
    expectSeoParity({
      title: 'Home',
      titleTemplate: '%s · My Site',
      description: 'Welcome home.',
      ogTitle: 'Home',
      ogDescription: 'Welcome home.',
      ogType: 'website',
      ogUrl: 'https://example.com/',
      ogSiteName: 'My Site',
      ogImage: 'https://example.com/og.png',
      twitterCard: 'summary_large_image',
      twitterSite: '@example',
      twitterCreator: '@harlan_zw',
    })
  })

  it('camelCase attribution: property vs name vs http-equiv', () => {
    expectSeoParity({
      ogTitle: 'og is property',
      twitterCard: 'summary',
      fbAppId: '1234567890',
      articlePublishedTime: '2024-01-01T00:00:00Z',
      profileFirstName: 'Harlan',
      appleMobileWebAppCapable: 'yes',
      msapplicationTileColor: '#00aba9',
      xUaCompatible: 'IE=edge',
      fediverseCreator: '@harlan@mastodon.social',
      googleSiteVerification: 'token',
    })
  })

  it('ogImage array of objects: all tags survive arrayable dedupe', () => {
    const input = {
      ogImage: [
        { url: 'https://example.com/1.png', width: 1200, height: 600, alt: 'One', type: 'image/png' },
        { url: 'https://example.com/2.png', width: 800 },
      ],
    }
    const b = v4Seo(input)
    for (const s of [
      '<meta property="og:image" content="https://example.com/1.png">',
      '<meta property="og:image" content="https://example.com/2.png">',
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:width" content="800">',
      '<meta property="og:image:height" content="600">',
      '<meta property="og:image:alt" content="One">',
      '<meta property="og:image:type" content="image/png">',
    ]) {
      expect(b.headTags).toContain(s)
    }
  })

  // KNOWN DIVERGENCE: v4 core flattens arrayable meta by identity slot, so the
  // second image's og:image:width no longer directly follows its og:image tag
  // (v3 re-sorts flat-meta groups by entry position, preserving the OG
  // structured-property adjacency). Needs a core/compile fix; see report.
  it('ogImage array of objects keeps per-image tag adjacency (v3 byte parity)', () => {
    expectSeoParity({
      ogImage: [
        { url: 'https://example.com/1.png', width: 1200, height: 600, alt: 'One', type: 'image/png' },
        { url: 'https://example.com/2.png', width: 800 },
      ],
    })
  })

  it('ogImage single object with secureUrl', () => {
    expectSeoParity({
      ogImage: { url: 'http://example.com/og.png', secureUrl: 'https://example.com/og.png', width: 1200 },
    })
  })

  it('twitterImage object', () => {
    expectSeoParity({
      twitterImage: { url: 'https://example.com/tw.png', alt: 'Card', width: 1200, height: 600 },
    })
  })

  it('robots object packing with false values dropped', () => {
    expectSeoParity({
      robots: { index: true, follow: true, nosnippet: false, maxSnippet: 20, maxImagePreview: 'large' },
    })
  })

  it('refresh + contentSecurityPolicy + appleItunesApp packed objects', () => {
    expectSeoParity({
      refresh: { seconds: 30, url: 'https://example.com/next' },
      contentSecurityPolicy: { defaultSrc: '\'self\'', imgSrc: 'https:' },
      appleItunesApp: { appId: '123456', appArgument: 'https://example.com/app' },
    })
  })

  it('charset + themeColor array + ogLocaleAlternate strings', () => {
    expectSeoParity({
      charset: 'utf-8',
      themeColor: [
        { content: '#0b0b0b', media: '(prefers-color-scheme: dark)' },
        { content: '#ffffff', media: '(prefers-color-scheme: light)' },
      ],
      ogLocaleAlternate: ['en_US', 'fr_FR'],
    })
  })

  it('numbers stringify, null content drops the tag', () => {
    expectSeoParity({
      ogImage: 'https://example.com/og.png',
      ogImageWidth: 1200,
      ogImageHeight: 600,
      description: null,
      keywords: undefined,
    })
  })

  it('expands to a regular head object', () => {
    expect(unpackSeoMetaInput({ title: 'Hi', titleTemplate: '%s · S', ogTitle: 'Hi' })).toEqual({
      title: 'Hi',
      titleTemplate: '%s · S',
      meta: [{ property: 'og:title', content: 'Hi' }],
    })
  })

  it('patch renormalizes flat input', () => {
    const head = createV4({ disableDefaults: true })
    const entry = useSeoMeta(head, { title: 'A', ogTitle: 'A', robots: { index: false, follow: true } })
    expect(renderV4(head).headTags).toContain('<meta name="robots" content="follow">')
    entry.patch({ title: 'B', ogTitle: 'B', robots: { index: true, follow: true } })
    const out = renderV4(head)
    expect(out.headTags).toContain('<title>B</title>')
    expect(out.headTags).toContain('<meta property="og:title" content="B">')
    expect(out.headTags).toContain('<meta name="robots" content="index, follow">')
    expect(out).toEqual(v4Seo({ title: 'B', ogTitle: 'B', robots: { index: true, follow: true } }))
  })

  it('repeated renders are stable', () => {
    const head = createV4({ disableDefaults: true })
    useSeoMeta(head, {
      title: 'Home',
      titleTemplate: '%s · My Site',
      ogImage: [{ url: 'https://example.com/1.png', width: 1200 }],
      robots: { index: true, follow: true },
    })
    const first = renderV4(head)
    for (let i = 0; i < 5; i++) renderV4(head)
    expect(renderV4(head)).toEqual(first)
  })
})

const TP_INPUT = {
  htmlAttrs: { lang: '%locale' },
  title: 'hello world ":',
  titleTemplate: '%s %separator %siteName',
  meta: [
    { name: 'description', content: 'Welcome to %siteName!' },
    { property: 'og:title', content: '%s %separator %siteName' },
    { property: 'twitter:image', content: 'https://cdn.example.com/some%20image.jpg' },
  ],
  link: [{ rel: 'canonical', href: 'https://example.com/%locale/about' }],
}
const TP_PARAMS = { separator: '|', locale: 'en', siteName: 'My Awesome Site' }

describe('v4 TemplateParamsPlugin parity with v3', () => {
  function v3Tp(input: Record<string, any>, params?: Record<string, any>) {
    const head = createV3({ disableDefaults: true, plugins: [TemplateParamsPluginV3] })
    head.push(params ? { ...input, templateParams: params } : input)
    return renderV3(head, { omitLineBreaks: true })
  }
  function v4Tp(input: Record<string, any>, params?: Record<string, any>) {
    const head = createV4({ disableDefaults: true })
    head.use(TemplateParamsPlugin)
    if (params)
      useTemplateParams(head, params)
    head.push(input)
    return renderV4(head)
  }

  it('title/meta/link/htmlAttrs substitution + separator', () => {
    expect(v4Tp(TP_INPUT, TP_PARAMS)).toEqual({ ...v3Tp(TP_INPUT, TP_PARAMS) })
  })

  it('separator collapses around empty neighbors', () => {
    const input = { title: null, titleTemplate: '%s %separator My Site' }
    const params = { separator: '-' }
    const a = v3Tp(input, params)
    const b = v4Tp(input, params)
    expect(b.headTags).toBe('<title>My Site</title>')
    expect(b).toEqual({ ...a })
  })

  it('pageTitle token uses the raw (pre-template) title', () => {
    const input = {
      title: 'About',
      titleTemplate: '%s %separator %siteName',
      meta: [{ property: 'og:title', content: '%pageTitle %separator %siteName' }],
    }
    const params = { siteName: 'Site' }
    const b = v4Tp(input, params)
    expect(b.headTags).toContain('<title>About | Site</title>')
    expect(b.headTags).toContain('<meta property="og:title" content="About | Site">')
    expect(b).toEqual({ ...v3Tp(input, params) })
  })

  it('dot notation params', () => {
    const input = { meta: [{ name: 'description', content: 'by %author.name' }] }
    const params = { author: { name: 'Harlan' } }
    expect(v4Tp(input, params)).toEqual({ ...v3Tp(input, params) })
  })

  it('no params registered: tokens without values stay, separators still collapse', () => {
    const input = { title: 'This|is|an|example||with||multiple||||pipes', meta: [{ name: 'description', content: '100% organic' }] }
    expect(v4Tp(input)).toEqual({ ...v3Tp(input) })
  })

  it('params handle: patch and dispose re-resolve', () => {
    const head = createV4({ disableDefaults: true })
    head.use(TemplateParamsPlugin)
    const params = useTemplateParams(head, { siteName: 'A' })
    head.push({ title: 'Page', titleTemplate: '%s %separator %siteName' })
    expect(renderV4(head).headTags).toBe('<title>Page | A</title>')
    params.patch({ siteName: 'B', separator: '·' })
    expect(renderV4(head).headTags).toBe('<title>Page · B</title>')
    params.dispose()
    // unmatched tokens stay literal, same as v3 with no params entry
    expect(renderV4(head).headTags).toBe('<title>Page | %siteName</title>')
  })

  it('repeated renders are stable', () => {
    const head = createV4({ disableDefaults: true })
    head.use(TemplateParamsPlugin)
    useTemplateParams(head, TP_PARAMS)
    head.push(TP_INPUT)
    const first = renderV4(head)
    for (let i = 0; i < 5; i++) renderV4(head)
    expect(renderV4(head)).toEqual(first)
  })
})

describe('v4 InferSeoMetaPlugin parity with v3', () => {
  function v3Infer(apply: (head: any) => void, options?: any) {
    const head = createV3({ disableDefaults: true, plugins: [InferSeoMetaPluginV3(options)] })
    apply(head)
    return renderV3(head, { omitLineBreaks: true })
  }
  function v4Infer(apply: (head: any) => void, options?: any) {
    const head = createV4({ disableDefaults: true })
    head.use(InferSeoMetaPlugin(options))
    apply(head)
    return renderV4(head)
  }

  const SIMPLE = {
    title: 'My Title',
    meta: [
      { name: 'description', content: 'My Description' },
      { property: 'og:image', content: 'https://example.com/image.jpg' },
    ],
  }

  it('infers og:title and og:description', () => {
    const a = v3Infer(h => h.push(SIMPLE))
    const b = v4Infer(h => h.push(SIMPLE))
    expect(b.headTags).toContain('<meta property="og:title" data-infer="" content="My Title">')
    expect(b.headTags).toContain('<meta property="og:description" data-infer="" content="My Description">')
    expect(b).toEqual({ ...a })
  })

  it('user og:title wins over the inferred placeholder', () => {
    const input = { title: 'My Title', meta: [{ property: 'og:title', content: 'Custom OG' }] }
    const a = v3Infer(h => h.push(input))
    const b = v4Infer(h => h.push(input))
    expect(b.headTags).toContain('<meta property="og:title" content="Custom OG">')
    expect(b.headTags).not.toContain('data-infer')
    expect(b).toEqual({ ...a })
  })

  it('nothing inferred when no title/description', () => {
    const a = v3Infer(h => h.push({ meta: [{ property: 'og:image', content: 'https://example.com/i.png' }] }), { twitterCard: false })
    const b = v4Infer(h => h.push({ meta: [{ property: 'og:image', content: 'https://example.com/i.png' }] }), { twitterCard: false })
    expect(b.headTags).not.toContain('og:title')
    expect(b).toEqual({ ...a })
  })

  it('transform options + twitterCard false', () => {
    const options = { twitterCard: false as const, ogTitle: (t?: string) => `${t}!`, ogDescription: (d?: string) => `${d}?` }
    const a = v3Infer(h => h.push(SIMPLE), options)
    const b = v4Infer(h => h.push(SIMPLE), options)
    expect(b.headTags).toContain('content="My Title!"')
    expect(b.headTags).toContain('content="My Description?"')
    expect(b).toEqual({ ...a })
  })

  it('infers the templated title', () => {
    const input = { title: 'Title', titleTemplate: '%s - My Site' }
    const b = v4Infer(h => h.push(input), { twitterCard: false })
    expect(b.headTags).toBe('<title>Title - My Site</title><meta property="og:title" data-infer="" content="Title - My Site">')
  })

  it('infers from a lone titleTemplate', () => {
    const b = v4Infer(h => h.push({ titleTemplate: 'Just a Site' }), { twitterCard: false })
    expect(b.headTags).toBe('<title>Just a Site</title><meta property="og:title" data-infer="" content="Just a Site">')
  })

  it('repeated renders are stable', () => {
    const head = createV4({ disableDefaults: true })
    head.use(InferSeoMetaPlugin())
    head.push(SIMPLE)
    const first = renderV4(head)
    for (let i = 0; i < 5; i++) renderV4(head)
    expect(renderV4(head)).toEqual(first)
  })
})

describe('v4 CanonicalPlugin parity with v3', () => {
  const OPTS = { canonicalHost: 'https://example.com' }
  function v3Canon(input: Record<string, any>, options: any = OPTS) {
    const head = createV3({ disableDefaults: true, plugins: [CanonicalPluginV3(options)] })
    head.push(input)
    return renderV3(head, { omitLineBreaks: true })
  }
  function v4Canon(input: Record<string, any>, options: any = OPTS) {
    const head = createV4({ disableDefaults: true })
    head.use(CanonicalPlugin(options))
    head.push(input)
    return renderV4(head)
  }

  it('absolutizes relative og:image/twitter:image/canonical', () => {
    const input = {
      meta: [
        { property: 'og:image', content: '/img/og.png' },
        { name: 'twitter:image', content: '/img/tw.png' },
        { property: 'og:image:width', content: 1200 },
      ],
      link: [{ rel: 'canonical', href: '/about' }],
    }
    const a = v3Canon(input)
    const b = v4Canon(input)
    expect(b.headTags).toContain('<meta property="og:image" content="https://example.com/img/og.png">')
    expect(b.headTags).toContain('<meta name="twitter:image" content="https://example.com/img/tw.png">')
    expect(b.headTags).toContain('<link rel="canonical" href="https://example.com/about">')
    expect(b).toEqual({ ...a })
  })

  it('leaves absolute urls untouched, resolves protocol-relative', () => {
    const input = {
      meta: [{ property: 'og:image', content: 'https://cdn.example.org/og.png' }],
      link: [{ rel: 'canonical', href: '//other.example.com/x' }],
    }
    expect(v4Canon(input)).toEqual({ ...v3Canon(input) })
  })

  it('og:url query params stripped, whitelist preserved, hash removed', () => {
    const input = {
      meta: [{ property: 'og:url', content: '/page?page=2&utm_source=x#section' }],
      link: [{ rel: 'canonical', href: '/page?page=2&utm_source=x' }],
    }
    const options = { ...OPTS, queryWhitelist: ['page'] }
    const a = v3Canon(input, options)
    const b = v4Canon(input, options)
    expect(b.headTags).toContain('content="https://example.com/page?page=2"')
    expect(b.headTags).toContain('href="https://example.com/page?page=2"')
    expect(b).toEqual({ ...a })
  })

  it('trailing slash normalization', () => {
    const input = { link: [{ rel: 'canonical', href: '/about' }] }
    const a = v4Canon(input, { ...OPTS, trailingSlash: true })
    expect(a.headTags).toContain('href="https://example.com/about/"')
    expect(a).toEqual({ ...v3Canon(input, { ...OPTS, trailingSlash: true }) })
    const input2 = { link: [{ rel: 'canonical', href: '/about/' }] }
    const b = v4Canon(input2, { ...OPTS, trailingSlash: false })
    expect(b.headTags).toContain('href="https://example.com/about"')
    expect(b).toEqual({ ...v3Canon(input2, { ...OPTS, trailingSlash: false }) })
  })

  it('customResolver', () => {
    const options = { ...OPTS, customResolver: (p: string) => `https://cdn.example.com${p}` }
    const input = { meta: [{ property: 'og:image', content: '/i.png' }] }
    expect(v4Canon(input, options)).toEqual({ ...v3Canon(input, options) })
  })

  it('repeated renders are stable', () => {
    const head = createV4({ disableDefaults: true })
    head.use(CanonicalPlugin(OPTS))
    head.push({
      meta: [{ property: 'og:image', content: '/img/og.png' }, { property: 'og:url', content: '/page?x=1' }],
      link: [{ rel: 'canonical', href: '/about' }],
    })
    const first = renderV4(head)
    for (let i = 0; i < 5; i++) renderV4(head)
    expect(renderV4(head)).toEqual(first)
  })
})

describe('v4 combined compat surface', () => {
  function build() {
    const head = createV4({ disableDefaults: true })
    head.use(InferSeoMetaPlugin())
    head.use(TemplateParamsPlugin)
    head.use(CanonicalPlugin({ canonicalHost: 'https://harlanzw.com' }))
    useTemplateParams(head, { separator: '·', siteName: 'Harlan Wilton' })
    useSeoMeta(head, {
      title: 'About',
      titleTemplate: '%s %separator %siteName',
      description: 'Open source developer.',
      ogImage: [{ url: '/og.png', width: 1200, height: 600 }],
      twitterCard: 'summary_large_image',
    })
    head.push({ link: [{ rel: 'canonical', href: '/about?utm_source=x' }] })
    return head
  }

  it('useSeoMeta + all three plugins compose', () => {
    const out = renderV4(build())
    expect(out.headTags).toContain('<title>About · Harlan Wilton</title>')
    expect(out.headTags).toContain('<meta property="og:image" content="https://harlanzw.com/og.png">')
    expect(out.headTags).toContain('<meta property="og:title" data-infer="" content="About · Harlan Wilton">')
    expect(out.headTags).toContain('<meta property="og:description" data-infer="" content="Open source developer.">')
    expect(out.headTags).toContain('<link rel="canonical" href="https://harlanzw.com/about">')
    expect(out.headTags).toContain('<meta name="twitter:card" content="summary_large_image">')
  })

  it('repeated renders are stable with all plugins', () => {
    const head = build()
    const first = renderV4(head)
    for (let i = 0; i < 5; i++) renderV4(head)
    expect(renderV4(head)).toEqual(first)
  })
})

describe('v4 slot API revisions (design 12 items 1-4)', () => {
  it('titlePlugin publishes shared.title/titleResolved before user plugins (registration order)', () => {
    const head = createV4({ disableDefaults: true })
    const seen: unknown[][] = []
    head.use({
      key: 'probe',
      resolve(ctx) {
        seen.push([ctx.shared.title, ctx.shared.titleResolved])
      },
    })
    head.push({ title: 'About', titleTemplate: '%s · Site' })
    renderV4(head)
    // TitlePlugin is registered first by createHead, so shared is already
    // populated when the user plugin's resolve slot runs
    expect(seen[0]).toEqual(['About', 'About · Site'])
  })

  it('shared.titleResolved covers lone titleTemplate and plain title', () => {
    const seen: unknown[] = []
    const probe = { key: 'probe', resolve: (ctx: any) => seen.push(ctx.shared.titleResolved) }
    const a = createV4({ disableDefaults: true })
    a.use(probe)
    a.push({ titleTemplate: 'Just a Site' })
    renderV4(a)
    const b = createV4({ disableDefaults: true })
    b.use(probe)
    b.push({ title: 'Plain' })
    renderV4(b)
    expect(seen).toEqual(['Just a Site', 'Plain'])
  })

  it('ctx.shared is fresh per resolve', () => {
    const head = createV4({ disableDefaults: true })
    const shareds: Record<string, unknown>[] = []
    const carried: boolean[] = []
    head.use({
      key: 'probe',
      resolve(ctx) {
        carried.push('x' in ctx.shared)
        ctx.shared.x = 1
        shareds.push(ctx.shared)
      },
    })
    head.push({ title: 'A' })
    renderV4(head)
    renderV4(head)
    expect(shareds[0]).not.toBe(shareds[1])
    expect(carried).toEqual([false, false])
  })

  it('dev-mode warn when patch() targets a tag with no identity', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const head = createV4({ disableDefaults: true })
    head.use({
      key: 'bad-patch',
      resolve(ctx) {
        ctx.each(t => !t.d && ctx.patch(t, { c: 'x' }))
      },
    })
    // script with src only compiles to d: '' (positionally unique)
    head.push({ script: [{ src: '/a.js' }] })
    renderV4(head)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('patch()')
    warn.mockRestore()
  })

  it('ctx.each unrolls arrayable slots', () => {
    const head = createV4({ disableDefaults: true })
    const seen: string[] = []
    head.use({
      key: 'probe',
      resolve(ctx) {
        ctx.each(t => seen.push(t.d))
      },
    })
    head.push({ meta: [
      { property: 'og:image', content: '/1.png' },
      { property: 'og:image', content: '/2.png' },
      { name: 'description', content: 'd' },
    ] })
    renderV4(head)
    // both og:image tags visited despite sharing one identity slot
    expect(seen.filter(d => d === 'meta:og:image')).toHaveLength(2)
    expect(seen).toContain('meta:description')
  })

  it('entry slot runs pre-compile at push and patch', () => {
    const head = createV4({ disableDefaults: true })
    head.use({
      key: 'entry-slot',
      entry(e) {
        const input = e.input as Record<string, any>
        if (input?.title)
          input.title = `${input.title}!`
      },
    })
    const handle = head.push({ title: 'A' })
    expect(renderV4(head).headTags).toBe('<title>A!</title>')
    handle.patch({ title: 'B' })
    expect(renderV4(head).headTags).toBe('<title>B!</title>')
  })

  it('tags slot transforms per entry and caches with it', () => {
    const head = createV4({ disableDefaults: true })
    let calls = 0
    head.use({
      key: 'tags-slot',
      tags(tags) {
        calls++
        return tags.map(t => t.d.startsWith('meta:') ? { ...t, p: { ...t.p, 'data-v': '1' } } : t)
      },
    })
    head.push({ meta: [{ name: 'description', content: 'd' }] })
    const first = renderV4(head)
    expect(first.headTags).toBe('<meta name="description" content="d" data-v="1">')
    renderV4(head)
    renderV4(head)
    expect(calls).toBe(1) // cached with the entry, not re-run per resolve
    head.push({ meta: [{ name: 'other', content: 'o' }] })
    renderV4(head)
    expect(calls).toBe(2) // only the new entry compiles through the slot
  })

  it('tags slot registered after pushes transforms already-pushed entries', () => {
    const head = createV4({ disableDefaults: true })
    head.push({ meta: [{ name: 'description', content: 'd' }] })
    // plan entry: cached tags exist the moment it is pushed
    head.push([[100, 'meta:x', '<meta name="x" content="1">']])
    expect(renderV4(head).headTags).toBe('<meta name="description" content="d"><meta name="x" content="1">')
    head.use({
      key: 'late-tags',
      tags: tags => tags.filter(t => t.d !== 'meta:description'),
    })
    // registration cliff: cached entry tags (loose and plan) rebuilt once
    expect(renderV4(head).headTags).toBe('<meta name="x" content="1">')
    expect(renderV4(head).headTags).toBe('<meta name="x" content="1">')
  })
})
