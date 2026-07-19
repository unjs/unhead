import type { ActiveHeadEntry, CreateClientHeadOptions, CreateHeadOptions, GenericScript, HeadEntry, HeadEntryOptions, HeadRenderer, HeadTag, HeadTagAttributeValue, HeadTagTitleTemplate, PreloadLink, PropResolver, ResolvableHead, SerializableHead, UnheadMeta } from '../../src/types'
import type { MetaKeyType, ResolveTagsOptions } from '../../src/utils'
import { expectTypeOf } from 'vitest'
import { createHead as createClientHead } from '../../src/client'
import { useHead, useHeadSafe, useScript, useSeoMeta } from '../../src/composables'
import { defineLink, defineScript } from '../../src/define'
import { defineHeadPlugin } from '../../src/plugins'
import { createHead } from '../../src/server'
import { createStreamableHead as createStreamableClientHead } from '../../src/stream/client'
import { createStreamableHead } from '../../src/stream/server'
import { normalizeEntryToTags, normalizeProps, resolvePackedMetaObjectValue, unpackMeta, walkResolver } from '../../src/utils'

describe('types', () => {
  it('ties useHead entries to the head input type', () => {
    const head = createHead()
    const entry = useHead(head, { title: 'Initial' })
    expectTypeOf(entry).toEqualTypeOf<ActiveHeadEntry<ResolvableHead>>()

    const customHead = createHead<{ custom: string }>({ disableDefaults: true })
    const customEntry = useHead(customHead, { custom: 'initial' })
    expectTypeOf(customEntry).toEqualTypeOf<ActiveHeadEntry<{ custom: string }>>()
    customEntry.patch({ custom: 'updated' })

    // @ts-expect-error the entry input must match the custom head
    customEntry.patch({ title: 'not-custom-input' })
    // @ts-expect-error an explicit generic cannot forge an entry type unrelated to the head
    useHead<{ forged: boolean }>(head, { forged: true })
    // @ts-expect-error custom heads with required fields need an initial input
    useHead(customHead)
    // @ts-expect-error custom server heads must opt out of the incompatible default entry
    createHead<{ custom: string }>()
    // @ts-expect-error omitting input and explicitly pushing undefined are distinct
    useHead(head, undefined)
  })
  it('requires synthesized entries to be compatible with the head input', () => {
    type RequiredExtension = ResolvableHead & { custom: string }
    type OptionalExtension = ResolvableHead & { custom?: string }
    type UnionInput = ResolvableHead | { custom: string }

    const requiredHead = createClientHead<RequiredExtension>()
    const customOnlyHead = createClientHead<{ custom: string }>()
    const optionalHead = createClientHead<OptionalExtension>()
    const unionHead = createClientHead<UnionInput>()

    useHead(requiredHead, { title: 'exact', custom: 'required' })

    // @ts-expect-error safe entries do not provide the required custom input
    useHeadSafe(requiredHead, {})
    // @ts-expect-error SEO entries do not provide the required custom input
    useSeoMeta(requiredHead, {})
    // @ts-expect-error script entries do not provide the required custom input
    useScript(requiredHead, '/required.js')
    // @ts-expect-error standard entries are unrelated to custom-only inputs
    useHeadSafe(customOnlyHead, {})
    // @ts-expect-error standard entries are unrelated to custom-only inputs
    useSeoMeta(customOnlyHead, {})
    // @ts-expect-error standard entries are unrelated to custom-only inputs
    useScript(customOnlyHead, '/custom.js')

    useHeadSafe(optionalHead, {})
    useSeoMeta(optionalHead, {})
    useScript(optionalHead, '/optional.js')
    useHeadSafe(unionHead, {})
    useSeoMeta(unionHead, {})
    useScript(unionHead, '/union.js')
  })
  it('preserves custom renderer return types', () => {
    const defaultHead = createClientHead()
    expectTypeOf(defaultHead.render()).toBeBoolean()

    const customHead = createClientHead({ render: head => void head.entries })
    expectTypeOf(customHead.render()).toBeUndefined()

    const literalHead = createClientHead({ render: head => head.ssr ? 'ssr' as const : 'client' as const })
    expectTypeOf(literalHead.render()).toEqualTypeOf<'ssr' | 'client'>()

    const initAndRendererHead = createClientHead({ init: [], render: head => head.ssr ? 'ssr' as const : 'client' as const })
    expectTypeOf(initAndRendererHead.push).parameter(0).toEqualTypeOf<ResolvableHead>()
    expectTypeOf(initAndRendererHead.render()).toEqualTypeOf<'ssr' | 'client'>()

    const annotatedRenderer: HeadRenderer<'annotated', ResolvableHead> = () => 'annotated'
    expectTypeOf(createClientHead({ render: annotatedRenderer }).render()).toEqualTypeOf<'annotated'>()
    expectTypeOf(createClientHead<ResolvableHead, void>({ render: () => undefined }).render()).toEqualTypeOf<void>()

    const pretypedOptions: CreateClientHeadOptions<ResolvableHead, void> = {}
    // @ts-expect-error void-typed hooks/plugins require an explicit void renderer
    createClientHead(pretypedOptions)

    // @ts-expect-error a non-boolean render result requires a matching renderer
    createClientHead<ResolvableHead, string>()
  })
  it('ties initial entries to the head input type', () => {
    const clientHead = createClientHead<{ custom: string }>({ init: [{ custom: 'client' }] })
    clientHead.push({ custom: 'updated' })
    // @ts-expect-error custom heads reject unrelated entries
    clientHead.push({ title: 'not-custom-input' })

    const serverHead = createHead<{ custom: string }>({ disableDefaults: true, init: [{ custom: 'server' }] })
    serverHead.push({ custom: 'updated' })
    // @ts-expect-error custom heads reject unrelated entries
    serverHead.push({ title: 'not-custom-input' })

    const emptyInitHead = createClientHead({ init: [] })
    const sentinelClientHead = createClientHead({ init: [false, undefined] })
    const sentinelInitHead = createHead({ init: [false, undefined] })
    expectTypeOf(emptyInitHead.push).parameter(0).toEqualTypeOf<ResolvableHead>()
    expectTypeOf(sentinelClientHead.push).parameter(0).toEqualTypeOf<ResolvableHead>()
    expectTypeOf(sentinelInitHead.push).parameter(0).toEqualTypeOf<ResolvableHead>()

    const inferredClientHead = createClientHead({ init: [{ custom: 'client' }] })
    expectTypeOf(inferredClientHead.push).parameter(0).toEqualTypeOf<{ custom: string }>()

    const serverHeadWithDefaults = createHead({ init: [{ custom: 'server' }] })
    expectTypeOf(serverHeadWithDefaults.push).parameter(0).toEqualTypeOf<ResolvableHead | { custom: string }>()

    const streamHead = createStreamableHead({ init: [] })
    const customStreamHead = createStreamableHead<{ custom: string }>({ disableDefaults: true })
    expectTypeOf(streamHead.head.push).parameter(0).toEqualTypeOf<ResolvableHead>()
    expectTypeOf(customStreamHead.head.push).parameter(0).toEqualTypeOf<{ custom: string }>()
    // @ts-expect-error custom streaming heads must opt out of the incompatible default entry
    createStreamableHead<{ custom: string }>()

    const falseHead = createClientHead<false>()
    expectTypeOf(useHead(falseHead, false)).toEqualTypeOf<ActiveHeadEntry<false>>()
    const undefinedHead = createClientHead<undefined>()
    expectTypeOf(useHead(undefinedHead, undefined)).toEqualTypeOf<ActiveHeadEntry<undefined>>()

    if (false) {
      expectTypeOf(createStreamableClientHead({ init: [] })!.push).parameter(0).toEqualTypeOf<ResolvableHead>()
      expectTypeOf(createStreamableClientHead({ init: [false, undefined] })!.push).parameter(0).toEqualTypeOf<ResolvableHead>()
      expectTypeOf(createStreamableClientHead<{ custom: string }>()!.push).parameter(0).toEqualTypeOf<ResolvableHead | { custom: string }>()
    }
  })
  it('exports extension types without narrowing existing entries', () => {
    expectTypeOf<MetaKeyType>().toEqualTypeOf<'name' | 'property' | 'http-equiv'>()
    expectTypeOf<ResolveTagsOptions>().toHaveProperty('tagWeight')
    expectTypeOf<NonNullable<HeadEntry<unknown>['options']>>()
      .toEqualTypeOf<Omit<HeadEntryOptions<unknown>, 'head' | 'onRendered'>>()
  })
  it('preserves properties validated by define helpers', () => {
    const preload = defineLink({
      rel: 'preload',
      as: 'script',
      href: '/entry.js',
    })
    expectTypeOf(preload.rel).toEqualTypeOf<'preload'>()
    expectTypeOf(preload.href).toEqualTypeOf<'/entry.js'>()

    const link = defineLink({
      'rel': 'openid2.provider',
      'href': 'https://example.com/openid',
      'data-provider': 'openid',
    })
    expectTypeOf(link['data-provider']).toEqualTypeOf<'openid'>()

    const module = defineScript({
      type: 'module',
      src: '/entry.js',
    })
    expectTypeOf(module.type).toEqualTypeOf<'module'>()
    expectTypeOf(module.src).toEqualTypeOf<'/entry.js'>()

    const script = defineScript({
      'type': 'text/plain',
      'textContent': 'debug-token',
      'data-purpose': 'debug',
    })
    expectTypeOf(script['data-purpose']).toEqualTypeOf<'debug'>()

    createClientHead().push({ link: [link], script: [script] })

    // Raw custom discriminants stay strict; the helpers apply the admission brand.
    // @ts-expect-error custom rels must pass through defineLink
    createClientHead().push({ link: [{ rel: 'openid2.provider', href: 'https://example.com/openid' }] })
    // @ts-expect-error custom script types must pass through defineScript
    createClientHead().push({ script: [{ type: 'text/plain', textContent: 'debug-token' }] })
  })
  it('types plugin hooks and utility results', () => {
    defineHeadPlugin({
      key: 'typed-hooks',
      hooks: {
        'tags:resolve': (ctx) => {
          expectTypeOf(ctx.tags).toEqualTypeOf<HeadTag[]>()
        },
        'tag:normalise': ({ tag, entry, resolvedOptions }) => {
          expectTypeOf(tag).toEqualTypeOf<HeadTag>()
          expectTypeOf(entry.input).toEqualTypeOf<ResolvableHead>()
          expectTypeOf(resolvedOptions).toEqualTypeOf<CreateHeadOptions<ResolvableHead>>()
        },
        'script:updated': ({ script }) => {
          expectTypeOf(script.id).toBeString()
          script.instance satisfies object | null
          // @ts-expect-error heterogeneous script APIs stay existential at a global hook
          void script.instance?.missing
        },
      },
    })

    defineHeadPlugin({
      key: 'invalid-hook',
      hooks: {
        // @ts-expect-error plugin hook names are checked
        'tags:unknown': () => {},
      },
    })

    const options: ResolveTagsOptions = { tagWeight: () => 100 }
    const metaKey: MetaKeyType = 'property'
    expectTypeOf(unpackMeta({ description: 'typed' })).toEqualTypeOf<UnheadMeta[]>()
    expectTypeOf(normalizeEntryToTags({}, [])).toEqualTypeOf<HeadTag[]>()
    expectTypeOf(normalizeProps({ tag: 'meta', props: {} }, { name: 'description' })).toEqualTypeOf<HeadTag>()
    expectTypeOf<HeadTag['props']['content']>().toEqualTypeOf<HeadTagAttributeValue | HeadTagAttributeValue[] | undefined>()
    expectTypeOf<HeadTag['props']['class']>().toEqualTypeOf<Set<string> | undefined>()
    expectTypeOf<HeadTag['props']['style']>().toEqualTypeOf<Map<string, string> | undefined>()
    expectTypeOf<HeadTag['props']['plugin-extension']>().toEqualTypeOf<unknown>()
    expectTypeOf<HeadTag['textContent']>().toEqualTypeOf<string | number | boolean | HeadTagTitleTemplate | undefined>()
    const resolver: PropResolver = (_key, value) => {
      expectTypeOf(value).toEqualTypeOf<unknown>()
      // @ts-expect-error resolver values must be narrowed before use
      void value.missing
      return value
    }
    expectTypeOf(normalizeEntryToTags({}, [resolver])).toEqualTypeOf<HeadTag[]>()
    expectTypeOf(resolvePackedMetaObjectValue({ seconds: 1, url: '/' }, 'refresh')).toBeString()
    expectTypeOf(walkResolver({ title: 'typed' })).toEqualTypeOf<unknown>()
    void options
    void metaKey
  })
  it('propagates custom head input through hooks and plugins', () => {
    interface CustomInput {
      custom: { required: string }
    }

    const clientHead = createClientHead<CustomInput>({
      init: [{ custom: { required: 'client' } }],
      hooks: {
        'entries:normalize': ({ entry }) => {
          expectTypeOf(entry.input).toEqualTypeOf<CustomInput>()
          entry.input.custom.required.toUpperCase()
          // @ts-expect-error custom hook inputs must not fall back to `any`
          void entry.input.missing
        },
      },
      plugins: [
        pluginHead => ({
          key: 'custom-client-plugin',
          hooks: {
            'entries:resolve': ({ entries }) => {
              expectTypeOf(entries[0].input).toEqualTypeOf<CustomInput>()
              pluginHead.push({ custom: { required: 'plugin' } })
              // @ts-expect-error plugin factories receive the same input contract as their head
              pluginHead.push({ title: 'not-custom-input' })
            },
          },
        }),
      ],
    })
    clientHead.hooks.hook('entries:updated', (hookHead) => {
      expectTypeOf(hookHead.render()).toBeBoolean()
      expectTypeOf(hookHead.entries.values().next().value!.input).toEqualTypeOf<CustomInput>()
    })

    const typedPlugin = defineHeadPlugin<CustomInput, boolean>({
      key: 'explicit-custom-plugin',
      hooks: {
        'entries:normalize': ({ entry }) => {
          expectTypeOf(entry.input).toEqualTypeOf<CustomInput>()
        },
      },
    })
    createClientHead<CustomInput>({ plugins: [typedPlugin] })

    if (false) {
      // @ts-expect-error script entries cannot satisfy a custom-only head input
      const script = useScript<{ lookup: (id: string) => number }>(clientHead, '/typed.js')
      expectTypeOf(script.proxy.lookup).parameter(0).toBeString()
    }

    createHead<CustomInput>({
      disableDefaults: true,
      hooks: {
        'entries:resolve': ({ entries }) => {
          expectTypeOf(entries[0].input).toEqualTypeOf<CustomInput>()
          // @ts-expect-error exact server heads preserve their custom input in hooks
          void entries[0].input.title
        },
      },
    })

    createHead({
      init: [{ custom: { required: 'with-defaults' } }],
      hooks: {
        'entries:resolve': ({ entries }) => {
          expectTypeOf(entries[0].input).toEqualTypeOf<ResolvableHead | CustomInput>()
        },
      },
    })
  })
  it('types useHead', () => {
    const unhead = createHead()
    // @ts-expect-error unknown html attributes are rejected
    useHead(unhead, { htmlAttrs: { foo: 'bla' } })
    // @ts-expect-error unknown base attributes are rejected
    useHead(unhead, { base: { href: '/base', uuuu: '' } })
    useHead(unhead, {
      htmlAttrs: {
        lang: () => false,
      },
      base: {
        href: '/base',
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
  it('types link attributes valid on every `<link>`', () => {
    // These are checked against the strict (non-resolvable) link union, which is
    // what a Nuxt `app.head` config resolves to.
    const head: SerializableHead = {
      link: [
        // Light / dark icons are selected with `media`
        { rel: 'icon', href: '/light.ico', media: '(prefers-color-scheme: light)' },
        { rel: 'shortcut icon', href: '/dark.ico', media: '(prefers-color-scheme: dark)' },
        { rel: 'apple-touch-icon', href: '/dark.png', media: '(prefers-color-scheme: dark)' },
        { rel: 'mask-icon', href: '/mask.svg', color: '#000', media: 'all' },
        // Icons may be fetched cross-origin
        { rel: 'icon', href: 'https://cdn.example.com/favicon.ico', crossorigin: 'anonymous' },
        // Legacy but valid `type` hints
        { rel: 'stylesheet', href: '/a.css', type: 'text/css' },
        { rel: 'manifest', href: '/manifest.json', type: 'application/manifest+json' },
      ],
    }
    void head

    // @ts-expect-error media must be a string
    const invalid: SerializableHead = { link: [{ rel: 'icon', href: '/f.ico', media: 123 }] }
    void invalid
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

    const genericScript: GenericScript = { type: 'text/plain', textContent: 'debug-token' }
    defineScript(genericScript)

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
