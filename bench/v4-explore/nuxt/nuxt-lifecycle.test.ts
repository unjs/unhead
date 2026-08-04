import type { V4Plugin } from '../../../packages/unhead/src/v4/core'
/**
 * Nuxt consumer simulation over real v4 APIs only (NUXT_INTEGRATION.md).
 *
 * Mirrors the actual Nuxt wiring verified against nuxt@4.5.1 dist:
 *   - nuxt.config head is known at build time -> sealed via emitEntryPlan,
 *     injected as a module-hoisted const (planToCode), pushed by the server
 *     plugin (today: unhead-options.mjs { disableDefaults: true } + appHead push)
 *   - components call useHead during app render; SSR collects, then the nitro
 *     renderer calls renderSSRHead and splices the payload into the template
 *   - the client plugin creates a head on the SSR document, re-pushes appHead
 *     and every component entry, and only flushes DOM on app:suspense:resolve
 *     (install-client-head.js pauseDOMUpdates -> v4 scheduler seam)
 *   - Suspense navigation = push new page entry, dispose old one later
 */
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { createHead as createClientHead } from '../../../packages/unhead/src/v4/client'
import { F_ID, F_RAW, T_SCRIPT } from '../../../packages/unhead/src/v4/core'
import { toEarlyHints } from '../../../packages/unhead/src/v4/early-hints'
import { emitEntryPlan, hole, PlanEmitError, planToCode } from '../../../packages/unhead/src/v4/emit'
import { CanonicalPlugin, InferSeoMetaPlugin, TemplateParamsPlugin, useTemplateParams } from '../../../packages/unhead/src/v4/plugins'

import { createHead as createServerHead, renderSSRHead } from '../../../packages/unhead/src/v4/server'

// --------------------------------------------------------------------------
// the app: nuxt.config head + app.vue + two pages
// --------------------------------------------------------------------------

const NUXT_CONFIG_HEAD = {
  htmlAttrs: { lang: 'en' },
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'preconnect', href: 'https://cdn.example.com' },
    { rel: 'preload', as: 'font', href: '/fonts/inter.woff2', crossorigin: '' },
  ],
  titleTemplate: '%s · Acme',
}

// app.vue useHead
const APP_ENTRY = {
  meta: [{ name: 'description', content: 'Acme, the default description' }],
  bodyAttrs: { class: 'antialiased' },
}

// pages/about.vue useHead
const ABOUT_ENTRY = {
  title: 'About',
  meta: [
    { name: 'description', content: 'About Acme' },
    { property: 'og:title', content: 'About' },
  ],
}

// pages/contact.vue useHead
const CONTACT_ENTRY = {
  title: 'Contact',
  meta: [
    { name: 'description', content: 'Contact Acme' },
    { property: 'og:title', content: 'Contact' },
  ],
}

/**
 * The Nuxt module's build step. nuxt.config head usually carries titleTemplate,
 * which cannot seal into an entry plan (runtime titles must template through
 * it); emitEntryPlan throws PlanEmitError as the deterministic bail signal and
 * the module splits: seal the static remainder, keep titleTemplate runtime.
 */
function nuxtModuleBuildStep() {
  expect(() => emitEntryPlan(NUXT_CONFIG_HEAD)).toThrow(PlanEmitError)
  const { titleTemplate, ...sealable } = NUXT_CONFIG_HEAD
  const { plan } = emitEntryPlan(sealable)
  // what gets written into the virtual module (#build/unhead-config-plan.mjs)
  const code = planToCode(plan)
  // fill-less plans are valid JSON: parse stands in for importing the emitted module
  return { CONFIG_PLAN: JSON.parse(code), titleTemplate }
}

function renderDocument(ssr: ReturnType<typeof renderSSRHead>) {
  return `<!DOCTYPE html><html${ssr.htmlAttrs}><head>${ssr.headTags}</head><body${ssr.bodyAttrs}>${ssr.bodyTagsOpen}<div id="app"></div>${ssr.bodyTags}</body></html>`
}

describe('nuxt lifecycle, end to end', () => {
  it('sealed config -> SSR -> hydration -> reactivity -> suspense navigation -> dispose', () => {
    // ---- build time (Nuxt module) ----
    const { CONFIG_PLAN, titleTemplate } = nuxtModuleBuildStep()

    // ---- nitro request: 103 Early Hints BEFORE the app renders ----
    // the sealed plan is a build artifact; the hint set needs zero resolve
    const hints = toEarlyHints(CONFIG_PLAN)
    expect(hints).toEqual([
      '<https://cdn.example.com>; rel=preconnect',
      '</fonts/inter.woff2>; rel=preload; as=font; crossorigin',
    ])

    // ---- SSR (unhead.server plugin + component setups) ----
    const server = createServerHead({ disableDefaults: true })
    server.push(CONFIG_PLAN)
    server.push({ titleTemplate })
    server.push(APP_ENTRY)
    server.push(ABOUT_ENTRY)
    const ssr = renderSSRHead(server)

    expect(ssr.headTags).toContain('<title>About · Acme</title>')
    expect(ssr.headTags).toContain('<meta charset="utf-8">')
    expect(ssr.headTags).toContain('<meta name="description" content="About Acme">')
    expect(ssr.htmlAttrs).toBe(' lang="en"')
    expect(ssr.bodyAttrs).toBe(' class="antialiased"')
    // capo: charset before viewport before title before the rest
    expect(ssr.headTags.indexOf('charset')).toBeLessThan(ssr.headTags.indexOf('viewport'))
    expect(ssr.headTags.indexOf('<title>')).toBeLessThan(ssr.headTags.indexOf('og:title'))

    // dual-path law at the Nuxt level: sealed config + runtime template renders
    // byte-identical to pushing the whole nuxt.config object through L1
    const runtimeOnly = createServerHead({ disableDefaults: true })
    runtimeOnly.push(NUXT_CONFIG_HEAD)
    runtimeOnly.push(APP_ENTRY)
    runtimeOnly.push(ABOUT_ENTRY)
    expect(renderSSRHead(runtimeOnly)).toEqual(ssr)

    // ---- client boot (unhead.client plugin) ----
    const dom = new JSDOM(renderDocument(ssr))
    const doc = dom.window.document
    const ssrHeadCount = doc.head.children.length
    const ssrDescEl = doc.querySelector('meta[name=description]')!

    // install-client-head.js pauses DOM updates until app:suspense:resolve;
    // the v4 scheduler seam is that pause: Nuxt holds the flush callback
    let flush: (() => void) | null = null
    const client = createClientHead({ document: doc, scheduler: f => (flush = f) })

    // hydration: appHead + every component useHead re-push (raw objects, as
    // Nuxt pushes appHead today; note NUXT_INTEGRATION.md on client plans)
    client.push(NUXT_CONFIG_HEAD)
    client.push(APP_ENTRY)
    const about = client.push(ABOUT_ENTRY)

    // nothing rendered while paused
    expect(doc.title).toBe('About · Acme')
    // app:suspense:resolve -> syncHead
    flush!()

    // lazy adoption: zero duplicate elements, SSR nodes reused in place
    expect(doc.head.children.length).toBe(ssrHeadCount)
    expect(doc.querySelector('meta[name=description]')).toBe(ssrDescEl)
    expect(doc.title).toBe('About · Acme')

    // ---- reactivity (the vue adapter's watch -> entry.patch) ----
    about.patch({ ...ABOUT_ENTRY, title: 'About Us' })
    flush!()
    expect(doc.title).toBe('About Us · Acme')
    expect(doc.head.children.length).toBe(ssrHeadCount)

    // ---- SPA navigation with Suspense overlap ----
    // contact's setup runs first (push), about disposes after the transition
    const contact = client.push(CONTACT_ENTRY)
    flush!()
    expect(doc.title).toBe('Contact · Acme')
    expect(doc.querySelector('meta[name=description]')).toBe(ssrDescEl)
    expect(ssrDescEl.getAttribute('content')).toBe('Contact Acme')

    about.dispose()
    flush!()

    // ---- final DOM state ----
    expect(doc.title).toBe('Contact · Acme')
    expect(ssrDescEl.getAttribute('content')).toBe('Contact Acme')
    expect(doc.querySelectorAll('meta[name=description]').length).toBe(1)
    expect(doc.querySelector('meta[property="og:title"]')!.getAttribute('content')).toBe('Contact')
    expect(doc.querySelector('link[rel=icon]')).toBeTruthy()
    expect(doc.documentElement.getAttribute('lang')).toBe('en')
    expect(doc.body.classList.contains('antialiased')).toBe(true)
    // still no duplicates: the head has exactly what SSR shipped
    expect(doc.head.children.length).toBe(ssrHeadCount)

    // page leaves entirely (e.g. error boundary tears the page down)
    contact.dispose()
    flush!()
    // app.vue's description takes back over; config tags untouched
    expect(ssrDescEl.getAttribute('content')).toBe('Acme, the default description')
    expect(doc.querySelector('meta[property="og:title"]')).toBeNull()
  })
})

describe('parameterized plans (bundler-extracted holes)', () => {
  it('fills + patch: static shape, dynamic strings, no L1 recompile', () => {
    // what useHead({ title: () => t.value, meta: [...] }) compiles into when
    // the shape is static: a hoisted plan + per-render fills
    const { plan, holes } = emitEntryPlan({
      title: hole(),
      meta: [{ name: 'description', content: hole() }],
    })
    expect(holes).toBe(2)

    const head = createServerHead({ disableDefaults: true })
    const entry = head.push(plan, { fills: ['Cats & Dogs', 'a "quoted" pitch'] })
    let ssr = renderSSRHead(head)
    // escape mode fixed at build time, applied at fill time
    expect(ssr.headTags).toContain('<title>Cats &amp; Dogs</title>')
    expect(ssr.headTags).toContain('content="a &quot;quoted&quot; pitch"')

    // the adapter's watch callback: entry.patch(PLAN, nextFills)
    entry.patch(plan, ['Next title', 'next desc'])
    ssr = renderSSRHead(head)
    expect(ssr.headTags).toContain('<title>Next title</title>')
    expect(ssr.headTags).toContain('content="next desc"')
  })

  it('island payload: sealed plan + fills survive JSON serialization', () => {
    // server components: head data crosses as data, not function calls
    const island = emitEntryPlan({
      meta: [
        { property: 'og:image', content: hole() },
        { property: 'og:image:width', content: 1200 },
      ],
    })
    // NuxtIslandResponse.head equivalent
    const payload = JSON.parse(JSON.stringify({
      plan: island.plan,
      fills: ['https://cdn.example.com/og/about.png'],
    }))

    const head = createServerHead({ disableDefaults: true })
    head.push(payload.plan, { fills: payload.fills })
    const ssr = renderSSRHead(head)
    expect(ssr.headTags).toContain('<meta property="og:image" content="https://cdn.example.com/og/about.png">')
    expect(ssr.headTags).toContain('<meta property="og:image:width" content="1200">')
  })

  it('island freeze: nuxt wraps head.push as a plain property (freezeHead port)', () => {
    const head = createServerHead({ disableDefaults: true })
    const realPush = head.push
    head.push = () => ({ patch: () => {}, dispose: () => {} })
    head.push({ title: 'ignored during island render' })
    head.push = realPush
    expect(renderSSRHead(head).headTags).toBe('')
  })
})

describe('plugins nuxt + nuxt seo register', () => {
  it('templateParams: params travel beside the entry graph', () => {
    const head = createServerHead({ disableDefaults: true })
    head.use(TemplateParamsPlugin)
    useTemplateParams(head, { siteName: 'Acme', separator: '·' })
    head.push({
      title: 'About %separator %siteName',
      meta: [{ property: 'og:site_name', content: '%siteName' }],
    })
    const ssr = renderSSRHead(head)
    expect(ssr.headTags).toContain('<title>About · Acme</title>')
    expect(ssr.headTags).toContain('content="Acme"')
  })

  it('inferSeoMeta + canonical: the nuxt-seo-utils pair', () => {
    const head = createServerHead({ disableDefaults: true })
    head.use(InferSeoMetaPlugin())
    head.use(CanonicalPlugin({ canonicalHost: 'https://acme.com' }))
    head.push({
      title: 'About',
      meta: [{ name: 'description', content: 'About Acme' }],
      link: [{ rel: 'canonical', href: '/about?utm_source=x' }],
    })
    const ssr = renderSSRHead(head)
    // note: v4 keeps its data-infer placeholder marker in the output (v3 emitted
    // clean tags); cosmetic divergence, flagged in NUXT_INTEGRATION.md
    expect(ssr.headTags).toContain('<meta property="og:title" data-infer="" content="About">')
    expect(ssr.headTags).toContain('<meta property="og:description" data-infer="" content="About Acme">')
    expect(ssr.headTags).toContain('<meta name="twitter:card" content="summary_large_image">')
    // canonical absolutized, tracking params stripped
    expect(ssr.headTags).toContain('<link rel="canonical" href="https://acme.com/about">')
  })

  it('schema-org shape: v3 entries:resolve/tags:resolve map onto resolve + head.entries', () => {
    // the v3 plugin collects nodes across all entries (entries:resolve), then
    // rewrites the single surviving ld+json tag (tags:resolve). v4 equivalent:
    // one resolve slot that enumerates head.entries (compiled tags are cached
    // there by resolve()) and patches the deduped winner copy-on-write.
    const SchemaOrgLike: V4Plugin = {
      key: 'schema-org',
      resolve(ctx) {
        const nodes: any[] = []
        for (const e of ctx.head.entries.values()) {
          for (const t of e.tags || []) {
            if ((t.f & F_ID) === T_SCRIPT && t.p?.nodes)
              nodes.push(...t.p.nodes)
          }
        }
        const tag = ctx.get('script:key:schema-org')
        if (tag && nodes.length) {
          const { nodes: _drop, ...p } = tag.p!
          ctx.patch(tag, {
            p,
            c: JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003C'),
            f: tag.f | F_RAW,
          })
        }
      },
    }

    const head = createServerHead({ disableDefaults: true })
    head.use(SchemaOrgLike)
    // two components each contribute nodes under the same key; core dedupe
    // keeps one tag, the plugin merges the full graph across entries
    head.push({ script: [{ type: 'application/ld+json', key: 'schema-org', nodes: [{ '@type': 'WebSite', 'name': 'Acme' }] }] })
    head.push({ script: [{ type: 'application/ld+json', key: 'schema-org', nodes: [{ '@type': 'AboutPage', 'name': 'About' }] }] })

    const ssr = renderSSRHead(head)
    const scripts = ssr.headTags.match(/application\/ld\+json/g)!
    expect(scripts.length).toBe(1)
    expect(ssr.headTags).toContain('"@type":"WebSite"')
    expect(ssr.headTags).toContain('"@type":"AboutPage"')
    expect(ssr.headTags).not.toContain('nodes=')

    // dispose parity with v3's per-cycle graph reset: nodes from a disposed
    // entry vanish because entries enumeration is the source of truth
    const extra = head.push({ script: [{ type: 'application/ld+json', key: 'schema-org', nodes: [{ '@type': 'FAQPage' }] }] })
    expect(renderSSRHead(head).headTags).toContain('FAQPage')
    extra.dispose()
    expect(renderSSRHead(head).headTags).not.toContain('FAQPage')
  })
})

describe('useHeadSafe', () => {
  // escape modes protect VALUES (attr quoting, title text, json fills), but
  // not semantics: F_RAW innerHTML is trusted, href="javascript:" is a valid
  // attr value, on* props render as live handlers. Safe mode therefore stays
  // an input-level allowlist, applied before push, exactly like v3's
  // SafeInputPlugin but with zero core involvement. Minimal port:
  const SAFE_META = new Set(['name', 'property', 'charset', 'content', 'media'])
  const SAFE_LINK = new Set(['rel', 'href', 'hreflang', 'media', 'type', 'sizes', 'color'])
  const SAFE_RELS = new Set(['canonical', 'icon', 'alternate', 'author', 'license', 'manifest'])
  const httpSafe = (v: unknown) => typeof v !== 'string' || !/^\s*(?:javascript|data|vbscript):/i.test(v)

  function sanitize(input: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {}
    if (typeof input.title === 'string' || typeof input.title === 'number')
      out.title = input.title
    out.meta = (input.meta || []).flatMap((m: any) => {
      if (m['http-equiv'] !== undefined)
        return [] // no CSP/refresh injection
      const clean: any = {}
      for (const k in m) SAFE_META.has(k) && !k.startsWith('on') && (clean[k] = m[k])
      return [clean]
    })
    out.link = (input.link || []).flatMap((l: any) => {
      if (!SAFE_RELS.has(l.rel) || !httpSafe(l.href))
        return []
      const clean: any = {}
      for (const k in l) SAFE_LINK.has(k) && (clean[k] = l[k])
      return [clean]
    })
    // script/style/noscript/htmlAttrs/bodyAttrs: dropped wholesale
    return out
  }

  it('escape modes handle value injection; the allowlist handles semantic injection', () => {
    const head = createServerHead({ disableDefaults: true })
    head.push(sanitize({
      title: '</title><script>alert(1)</script>',
      meta: [
        { name: 'description', content: 'ok "quoted"', onload: 'alert(1)' },
        { 'http-equiv': 'refresh', 'content': '0;url=javascript:alert(1)' },
      ],
      link: [
        { rel: 'canonical', href: 'https://acme.com/about' },
        { rel: 'stylesheet', href: 'javascript:alert(1)' },
        { rel: 'icon', href: 'javascript:alert(2)' },
      ],
      script: [{ innerHTML: 'alert(1)' }],
    }))
    const ssr = renderSSRHead(head)
    // title escaped by the compile-time contract (escape mode, not allowlist)
    expect(ssr.headTags).toContain('&lt;&#x2F;title&gt;&lt;script&gt;')
    expect(ssr.headTags).not.toContain('<script')
    expect(ssr.headTags).not.toContain('javascript:')
    expect(ssr.headTags).not.toContain('onload')
    expect(ssr.headTags).not.toContain('http-equiv')
    expect(ssr.headTags).toContain('content="ok &quot;quoted&quot;"')
    expect(ssr.headTags).toContain('<link rel="canonical" href="https://acme.com/about">')
  })
})

describe('early hints from a live head (dynamic fallback path)', () => {
  it('per-request hints after entries are pushed but before body render completes', () => {
    const head = createServerHead({ disableDefaults: true })
    head.push({
      link: [
        { rel: 'preload', as: 'image', href: '/hero.avif', fetchpriority: 'high' },
        { rel: 'stylesheet', href: '/app.css' },
      ],
    })
    expect(toEarlyHints(head)).toEqual(['</hero.avif>; rel=preload; as=image; fetchpriority=high'])
  })
})
