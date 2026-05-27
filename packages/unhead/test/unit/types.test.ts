import type { PreloadLink, SerializableHead } from '../../src/types'
import { useHead, useHeadSafe, useSeoMeta } from '../../src/composables'
import { defineLink, defineScript } from '../../src/define'
import { createHead } from '../../src/server'

describe('types', () => {
  it('types useHead', () => {
    const unhead = createHead()
    useHead(unhead, {
      htmlAttrs: {
        // @ts-expect-error expected
        foo: 'bla',
        lang: () => false,
      },
      base: {
        href: '/base',
        // @ts-expect-error expected
        uuuu: '',
      },
      link: () => [],
      meta: [
        { key: 'key', name: 'description', content: 'some description ' },
        () => ({ key: 'key', name: 'description', content: 'some description ' }),
      ],
      script: [
        () => 'test',
        {
          innerHTML: () => 'foo',
        },
      ],
      style: () => [
        () => 'foo',
      ],
      titleTemplate: (titleChunk) => {
        return titleChunk ? `${titleChunk} - Site Title` : 'Site Title'
      },
    })
  })
  it('types useHeadSafe', () => {
    const head = createHead()
    useHeadSafe(head, {
      script: [
        {
          type: 'application/json',
          id: 'xss-script',
          innerHTML: 'alert("xss")',
        },
      ],
      meta: [
        {
          // @ts-expect-error not allowed
          'http-equiv': 'refresh',
          'content': '0;javascript:alert(1)',
        },
      ],
    }, { head })
  })
  it('types useSeoMeta', () => {
    const head = createHead()
    useSeoMeta(head, {
      description: () => 'hello world',
      robots: {
        index: () => true,
      },
    })
  })
  it('types preload link enforces `as` via PreloadLink', () => {
    const head = createHead()

    // Valid: preload with `as`
    useHead(head, {
      link: [
        { rel: 'preload', href: '/font.woff2', as: 'font', crossorigin: 'anonymous' },
        { rel: 'preload', href: '/script.js', as: 'script' },
        { rel: 'preload', href: '/style.css', as: 'style' },
        { rel: 'preload', href: '/video.mp4', as: 'video' },
      ],
    })

    // Valid: modulepreload (`as` is optional — browser infers script)
    useHead(head, {
      link: [
        { rel: 'modulepreload', href: '/module.js' },
      ],
    })

    // The `PreloadLink` type directly enforces `as` as required.
    // Typing a variable as `PreloadLink` (or one of its subtypes) correctly
    // rejects missing `as` at the type level:
    const validPreloadLink: PreloadLink = { rel: 'preload', href: '/font.woff2', as: 'font', crossorigin: 'anonymous' }
    // @ts-expect-error `as` is required for PreloadLink
    const invalidPreloadLink: PreloadLink = { rel: 'preload', href: '/font.woff2' }

    void validPreloadLink
    void invalidPreloadLink
  })
  it('types defineLink with union rels (e.g. preconnect/dns-prefetch)', () => {
    const head = createHead()
    const eager = Math.random() > 0.5

    // Valid: runtime-determined rel across structurally-compatible variants.
    // Without defineLink, the Link discriminated union can't pick a branch for
    // a union rel — this is the canonical workaround.
    useHead(head, {
      link: [
        defineLink({
          rel: eager ? 'preconnect' : 'dns-prefetch',
          href: 'https://example.com',
        }),
      ],
    })

    // Valid: preconnect-only `crossorigin` still allowed (structural intersection
    // keeps optional fields from any matching variant).
    useHead(head, {
      link: [
        defineLink({
          rel: eager ? 'preconnect' : 'dns-prefetch',
          href: 'https://example.com',
          crossorigin: 'anonymous',
        }),
      ],
    })

    // Valid: single-rel input still strictly narrowed
    useHead(head, {
      link: [
        defineLink({ rel: 'preconnect', href: 'https://example.com', crossorigin: 'anonymous' }),
      ],
    })

    // Invalid: missing href is still rejected for a known rel that requires it
    // @ts-expect-error href is required
    defineLink({ rel: eager ? 'preconnect' : 'dns-prefetch' })

    // Invalid: a union mixing rels with incompatible required fields (preload
    // requires `as`) still forces the stricter requirement.
    // @ts-expect-error `as` is required when 'preload' is in the rel union
    defineLink({ rel: eager ? 'preload' : 'modulepreload', href: '/m.js' })
  })
  it('types defineScript with union types (e.g. text/javascript / module)', () => {
    const head = createHead()
    const useModule = Math.random() > 0.5

    // Valid: runtime-determined script type across structurally-compatible variants
    useHead(head, {
      script: [
        defineScript({
          type: useModule ? 'module' : 'text/javascript',
          src: '/app.js',
        }),
      ],
    })

    // Valid: single-type input still strictly narrowed
    useHead(head, {
      script: [
        defineScript({ type: 'application/ld+json', textContent: '{}' }),
      ],
    })

    // Invalid: a union mixing types with incompatible required fields
    // (application/ld+json requires textContent) forces the stricter requirement.
    // @ts-expect-error textContent is required when 'application/ld+json' is in the type union
    defineScript({ type: useModule ? 'text/javascript' : 'application/ld+json', src: '/a.js' })
  })
  it('types defineLink union rels: adversarial coverage', () => {
    const cond = Math.random() > 0.5

    // ── Single-literal rel: strict narrowing preserved ────────────────────

    // @ts-expect-error 'preload' requires `as`
    defineLink({ rel: 'preload', href: '/x' })

    // @ts-expect-error 'modulepreload' requires `href`
    defineLink({ rel: 'modulepreload' })

    // valid: preload with full required shape
    defineLink({ rel: 'preload', href: '/font.woff2', as: 'font', crossorigin: 'anonymous' })

    // ── Two-rel union, structurally compatible ────────────────────────────

    defineLink({ rel: cond ? 'preconnect' : 'dns-prefetch', href: '/' })
    defineLink({ rel: cond ? 'dns-prefetch' : 'prerender', href: '/' })

    // @ts-expect-error href still required across the union
    defineLink({ rel: cond ? 'preconnect' : 'dns-prefetch' })

    // ── Three-rel union ───────────────────────────────────────────────────

    const r3: 'preconnect' | 'dns-prefetch' | 'prerender' = cond ? 'preconnect' : 'dns-prefetch'
    defineLink({ rel: r3, href: '/' })

    // ── Optional carry-over: crossorigin only meaningful on preconnect ───
    // Intersection keeps it as optional, so it's accepted across the union.
    defineLink({ rel: cond ? 'preconnect' : 'dns-prefetch', href: '/', crossorigin: 'anonymous' })

    // Wrong literal value for an optional carried-over field is still rejected
    // @ts-expect-error 'bogus' not in crossorigin literal union
    defineLink({ rel: cond ? 'preconnect' : 'dns-prefetch', href: '/', crossorigin: 'bogus' })

    // ── Union with differing required fields: stricter wins ──────────────

    // @ts-expect-error 'preload' contributes required `as`
    defineLink({ rel: cond ? 'preload' : 'modulepreload', href: '/m.js' })

    // Supplying `as` satisfies the preload branch
    defineLink({ rel: cond ? 'preload' : 'modulepreload', href: '/m.js', as: 'script' })

    // ── Variant with rel that's itself a union (FaviconLink: icon | shortcut icon) ─

    defineLink({ rel: 'icon', href: '/favicon.ico' })
    defineLink({ rel: 'shortcut icon', href: '/favicon.ico' })
    defineLink({ rel: cond ? 'icon' : 'shortcut icon', href: '/favicon.ico' })
    // Plus extra rels around it
    defineLink({ rel: cond ? 'icon' : 'apple-touch-icon', href: '/favicon.ico' })

    // ── Known + unknown rel mix falls through to generic ─────────────────

    defineLink({ rel: 'openid2.provider', href: 'https://op.example.com/' })
    // Custom rel doesn't enforce stylesheet shape
    defineLink({ rel: 'EditURI', href: '/rsd.xml', type: 'application/rsd+xml' })

    // ── rel widened to string falls through to generic ───────────────────

    const wideRel = (cond ? 'preconnect' : 'custom-rel') as string
    defineLink({ rel: wideRel, href: '/' })

    // ── Wrong field type still rejected on union input ───────────────────

    // @ts-expect-error href must be string
    defineLink({ rel: cond ? 'preconnect' : 'dns-prefetch', href: 123 })

    // ── as const inputs accepted (DeepReadonly) ───────────────────────────

    defineLink({ rel: 'icon', href: '/favicon.ico', sizes: '32x32' } as const)

    // ── Excess properties on union input are accepted (data-*, custom attrs) ─

    defineLink({
      'rel': cond ? 'preconnect' : 'dns-prefetch',
      'href': '/',
      'data-test': 'ok',
    })

    // ── Empty union (impossible at runtime, but exercise the type) ───────

    type EmptyRel = never
    // @ts-expect-error rel cannot be never
    defineLink({ rel: null as unknown as EmptyRel, href: '/' })

    // ── Full structural union covering most KnownLinkRel resource hints ──

    const allHints: 'preconnect' | 'dns-prefetch' | 'prerender' | 'prefetch'
      = cond ? 'preconnect' : 'prefetch'
    // 'prefetch' adds optional `as` — should be accepted with or without it
    defineLink({ rel: allHints, href: '/' })
    defineLink({ rel: allHints, href: '/', as: 'script' })

    // ── Variant whose rel is itself a union, combined with another rel ───
    // FaviconLink rel = 'icon' | 'shortcut icon'; combine with 'manifest'
    defineLink({ rel: cond ? 'icon' : 'manifest', href: '/manifest.json' })
  })
  it('types defineScript union types: adversarial coverage', () => {
    const cond = Math.random() > 0.5

    // ── Single-literal type: strict narrowing preserved ──────────────────

    defineScript({ type: 'application/ld+json', textContent: '{"@context":"…"}' })

    // @ts-expect-error 'application/ld+json' requires textContent
    defineScript({ type: 'application/ld+json' })

    defineScript({ type: 'module', src: '/x.mjs' })

    // ── Compatible two-type union ────────────────────────────────────────

    defineScript({ type: cond ? 'text/javascript' : 'module', src: '/app.js' })
    defineScript({ type: cond ? '' : 'text/javascript', src: '/app.js' })

    // ── Incompatible required fields force stricter shape ────────────────

    // @ts-expect-error 'application/ld+json' requires textContent
    defineScript({ type: cond ? 'text/javascript' : 'application/ld+json', src: '/a.js' })

    // Supplying textContent satisfies the ld+json branch
    defineScript({
      type: cond ? 'text/javascript' : 'application/ld+json',
      textContent: '{}',
    })

    // ── Custom type falls through to GenericScript ───────────────────────

    defineScript({ type: 'text/partytown', src: '/p.js' })

    // ── type widened to string falls through ─────────────────────────────

    const wideType = (cond ? 'text/javascript' : 'text/plain') as string
    defineScript({ type: wideType, src: '/a.js' })

    // ── Wrong field type still rejected on union input ───────────────────

    // @ts-expect-error src must be string
    defineScript({ type: cond ? 'text/javascript' : 'module', src: 123 })
  })
  it('types SerializableHead', () => {
    const head = createHead()
    const input = {
      title: 'Hello',
      meta: [
        { name: 'description', content: 'Static content' },
        { property: 'og:image', content: 'https://example.com/1.jpg' },
      ],
      script: [
        { src: 'https://example.com/script.js' },
      ],
      link: [
        { rel: 'stylesheet', href: 'style1.css' },
      ],
      // Validate HTML attributes
      htmlAttrs: {
        // @ts-expect-error testing validation
        foo: 'bla',
        lang: 'en',
        class: 'dark',
      },
      // Validate body attributes
      bodyAttrs: {
        class: 'bg-gray-100',
      },
      wefwefe: 'wefef',
      broken: 'foo',
    } satisfies SerializableHead
    useHead(head, input)
  })
})
