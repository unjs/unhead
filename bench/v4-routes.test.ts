/**
 * Route-aware hybrid compilation: emitRouteHead classification, premerge
 * override parity against the fully-runtime path, prerender recording, and
 * client boot/patch navigation over premerged route plans.
 */
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { createHead as createCompiledClient } from '../packages/unhead/src/v4/client-compiled'
import { compileEntry } from '../packages/unhead/src/v4/compile'
import { createCore } from '../packages/unhead/src/v4/core'
import { emitRouteHead, hole } from '../packages/unhead/src/v4/emit'
import { recordRouteHead } from '../packages/unhead/src/v4/record'
import { createHead as createServer, renderSSRHead } from '../packages/unhead/src/v4/server'
import { createHead as createCompiledServer } from '../packages/unhead/src/v4/server-compiled'
import { renderSSRRoutePlan } from '../packages/unhead/src/v4/server-plans'
import { toPlan } from './v4/fixtures'

// guaranteed route sources: app shell, layout, route rule, page
const APP = { htmlAttrs: { lang: 'en' }, script: [{ src: '/analytics.js', defer: true, key: 'analytics' }] }
const LAYOUT_DOCS = { bodyAttrs: { class: 'docs-layout' }, meta: [{ name: 'theme-color', content: '#111111' }] }
const RULE = { meta: [{ name: 'robots', content: 'index, follow' }] }
const PAGE_A = {
  title: 'Install',
  meta: [
    { name: 'description', content: 'How to install.' },
    { property: 'og:title', content: 'Install' },
  ],
  link: [{ rel: 'canonical', href: 'https://example.com/install' }],
}
const PAGE_B = {
  title: 'Guide',
  meta: [
    { name: 'description', content: 'The guide.' },
    { property: 'og:title', content: 'Guide' },
  ],
  link: [{ rel: 'canonical', href: 'https://example.com/guide' }],
}

const ROUTE_A = [
  { source: 'app' as const, input: APP },
  { source: 'layout' as const, input: LAYOUT_DOCS },
  { source: 'route-rule' as const, input: RULE },
  { source: 'page' as const, input: PAGE_A },
]
// route B uses a bare layout: docs body class must disappear on nav
const ROUTE_B = [
  { source: 'app' as const, input: APP },
  { source: 'route-rule' as const, input: RULE },
  { source: 'page' as const, input: PAGE_B },
]

describe('emitRouteHead classification', () => {
  it('folds a fully static prerendered route to a final payload', () => {
    const emitted = emitRouteHead(ROUTE_A, { prerender: true })
    expect(emitted.kind).toBe('payload')

    const loose = createServer()
    for (const s of ROUTE_A) loose.push(s.input)
    expect((emitted as any).payload).toEqual(renderSSRHead(loose))
    expect(JSON.parse((emitted as any).code)).toEqual((emitted as any).payload)
  })

  it('keeps hole-bearing prerender routes on the plan path with a working fill map', () => {
    const emitted = emitRouteHead([
      { source: 'app', input: APP },
      { source: 'page', input: { title: hole(), meta: [{ name: 'description', content: hole() }] } },
    ], { prerender: true })
    expect(emitted.kind).toBe('plan')
    if (emitted.kind !== 'plan')
      return
    expect(emitted.holes).toBe(2)

    const fills = ['Install', 'How to install.']
    const direct = renderSSRRoutePlan(emitted.ssrPlan, emitted.fillOrder.map(i => fills[i]))
    const loose = createServer()
    loose.push(APP)
    loose.push({ title: 'Install', meta: [{ name: 'description', content: 'How to install.' }] })
    expect(direct).toEqual(renderSSRHead(loose))
  })

  it('refuses to seal a titleTemplate unless the integration proves title closure', () => {
    const emitted = emitRouteHead([
      { source: 'app', input: { titleTemplate: '%s · Site' } },
      { source: 'page', input: PAGE_A },
    ])
    expect(emitted.kind).toBe('runtime')
    if (emitted.kind === 'runtime')
      expect(emitted.reason).toContain('titleTemplate')
  })

  it('folds titleTemplate over a static title when explicitly allowed', () => {
    const emitted = emitRouteHead([
      { source: 'app', input: { titleTemplate: '%s · Site' } },
      { source: 'page', input: PAGE_A },
    ], { allowTitleTemplate: true })
    expect(emitted.kind).toBe('plan')
    if (emitted.kind === 'plan')
      expect(renderSSRRoutePlan(emitted.ssrPlan).headTags).toContain('<title>Install · Site</title>')
  })

  it('demonstrates the hazard the titleTemplate refusal exists for', () => {
    const emitted = emitRouteHead([
      { source: 'app', input: { titleTemplate: '%s · Site' } },
      { source: 'page', input: PAGE_A },
    ], { allowTitleTemplate: true })
    if (emitted.kind !== 'plan')
      throw new Error('expected plan')
    // a runtime title arriving after the seal escapes the consumed template
    const head = createCompiledServer()
    head.push(emitted.plan)
    head.push(toPlan({ title: 'Changed' }))
    expect(renderSSRHead(head as any).headTags).toContain('<title>Changed</title>')

    const loose = createServer()
    loose.push({ titleTemplate: '%s · Site' })
    loose.push(PAGE_A)
    loose.push({ title: 'Changed' })
    expect(renderSSRHead(loose).headTags).toContain('<title>Changed · Site</title>')
  })

  it('returns the emitter refusal reason instead of throwing or silently falling back', () => {
    const emitted = emitRouteHead([
      { source: 'page', input: { script: [{ innerHTML: () => 'nope' }] } },
    ])
    expect(emitted.kind).toBe('runtime')
    if (emitted.kind === 'runtime')
      expect(emitted.reason).toContain('function values cannot be compiled')
  })
})

describe('premerge override parity', () => {
  it('runtime entries override a premerged route plan exactly like the loose path', () => {
    const emitted = emitRouteHead(ROUTE_A)
    if (emitted.kind !== 'plan')
      throw new Error('expected plan')

    const overrides: Record<string, any>[] = [
      { meta: [{ name: 'description', content: 'Overridden by a component.' }] },
      { title: 'Runtime title' },
    ]

    const loose = createServer()
    for (const s of ROUTE_A) loose.push(s.input)
    for (const o of overrides) loose.push(o)

    const hybrid = createServer()
    hybrid.push(emitted.plan)
    for (const o of overrides) hybrid.push(o)

    expect(renderSSRHead(hybrid)).toEqual(renderSSRHead(loose))
  })

  it('renders the premerged route byte-identically through the direct renderer', () => {
    const emitted = emitRouteHead(ROUTE_A)
    if (emitted.kind !== 'plan')
      throw new Error('expected plan')
    const loose = createServer()
    for (const s of ROUTE_A) loose.push(s.input)
    expect(renderSSRRoutePlan(emitted.ssrPlan)).toEqual(renderSSRHead(loose))
  })
})

describe('recordRouteHead', () => {
  it('marks a compiled head fed only sealed plans as static', () => {
    const emitted = emitRouteHead(ROUTE_A)
    if (emitted.kind !== 'plan')
      throw new Error('expected plan')
    const head = createCompiledServer()
    head.push(emitted.plan)
    const recorded = recordRouteHead(head as any)
    expect(recorded.kind).toBe('static')
    expect(recorded.payload).toEqual(renderSSRHead(head as any))
  })

  it('marks plugin-bearing heads dynamic with the reason', () => {
    const head = createServer() // default profile registers TitlePlugin
    head.push(toPlan(PAGE_A))
    const recorded = recordRouteHead(head)
    expect(recorded.kind).toBe('dynamic')
    if (recorded.kind === 'dynamic')
      expect(recorded.reason).toContain('plugins')
  })

  it('marks loose entries dynamic with the entry id', () => {
    const head = createCore({ ssr: true, compile: compileEntry })
    head.push(toPlan(APP))
    head.push({ title: 'Loose' })
    const recorded = recordRouteHead(head)
    expect(recorded.kind).toBe('dynamic')
    if (recorded.kind === 'dynamic')
      expect(recorded.reason).toContain('loose input')
  })
})

describe('client route plan navigation', () => {
  function ssrDocument(sources: typeof ROUTE_A) {
    const emitted = emitRouteHead(sources)
    if (emitted.kind !== 'plan')
      throw new Error('expected plan')
    const ssr = renderSSRRoutePlan(emitted.ssrPlan)
    const dom = new JSDOM(`<!DOCTYPE html><html${ssr.htmlAttrs}><head>${ssr.headTags}</head><body${ssr.bodyAttrs}>${ssr.bodyTagsOpen}<div id="app"></div>${ssr.bodyTags}</body></html>`)
    return { dom, plan: emitted.plan }
  }

  it('hydrates by adoption and swaps routes with an entry patch', () => {
    const { dom, plan: planA } = ssrDocument(ROUTE_A)
    const doc = dom.window.document
    const before = [...doc.head.children].map(el => el.outerHTML)

    const head = createCompiledClient({ document: doc, scheduler: flush => flush() })
    const route = head.push(planA)
    head.render()
    // adoption: no new elements, no rewrites
    expect([...doc.head.children].map(el => el.outerHTML)).toEqual(before)
    expect(doc.body.className).toBe('docs-layout')

    const emittedB = emitRouteHead(ROUTE_B)
    if (emittedB.kind !== 'plan')
      throw new Error('expected plan')
    route.patch(emittedB.plan)
    head.render()

    expect(doc.title).toBe('Guide')
    expect(doc.querySelectorAll('meta[name=description]')).toHaveLength(1)
    expect(doc.querySelector('meta[name=description]')!.getAttribute('content')).toBe('The guide.')
    expect(doc.querySelector('link[rel=canonical]')!.getAttribute('href')).toBe('https://example.com/guide')
    // route B has no docs layout: its premerged body class must be reverted
    expect(doc.body.className).toBe('')
    expect(doc.querySelector('meta[name=theme-color]')).toBeNull()
    // app-level tags survive the swap without duplication
    expect(doc.querySelectorAll('script[src="/analytics.js"]')).toHaveLength(1)
  })

  it('survives Suspense overlap between two route-level premerged plans (push B, then dispose A)', () => {
    // Suspense/route-transition contract: the destination route's setup (and
    // its useHead-derived plan) runs and pushes BEFORE the departing route's
    // entry disposes. This is the same push-B-then-dispose-A ordering
    // suspense-overlap.test.ts proves for loose entries; here both sides are
    // ROUTE-LEVEL premerged plans (app+layout+route-rule+page folded at
    // build time), which is the shape route premerge actually ships.
    const { dom, plan: planA } = ssrDocument(ROUTE_A)
    const doc = dom.window.document
    const head = createCompiledClient({ document: doc, scheduler: flush => flush() })
    const routeA = head.push(planA)
    head.render()

    const emittedB = emitRouteHead(ROUTE_B)
    if (emittedB.kind !== 'plan')
      throw new Error('expected plan')
    // destination route mounts (push B) while A is still alive: no dispose yet
    const routeB = head.push(emittedB.plan)
    head.render()

    // overlap window: both entries alive, B (later, equal weight) wins every
    // contested identity, and app-level tags shared by both plans (analytics
    // script, htmlAttrs.lang) are not duplicated because dedupe is identity-
    // keyed, not entry-keyed.
    expect(doc.title).toBe('Guide')
    expect(doc.querySelector('meta[name=description]')!.getAttribute('content')).toBe('The guide.')
    expect(doc.querySelectorAll('script[src="/analytics.js"]')).toHaveLength(1)
    expect(doc.documentElement.lang).toBe('en')
    // A's docs-layout body class is still live: B hasn't disposed A yet, and
    // B's own route plan carries no bodyAttrs (ROUTE_B has no layout entry),
    // so nothing in B's plan contests the class union while both are alive.
    expect(doc.body.className).toBe('docs-layout')

    // departing route unmounts: dispose A only after B has fully rendered
    routeA.dispose()
    head.render()

    // B's tags are untouched by A's dispose; the shared app-level tag
    // (owned by both entries' identity set) survives because B still holds it
    expect(doc.title).toBe('Guide')
    expect(doc.querySelector('meta[name=description]')!.getAttribute('content')).toBe('The guide.')
    expect(doc.querySelectorAll('script[src="/analytics.js"]')).toHaveLength(1)
    // only now, once A (the sole remaining source of the docs layout class)
    // is gone, does the layout class revert
    expect(doc.body.className).toBe('')
    void routeB
  })

  it('lets a per-callsite component plan override the premerged route plan', () => {
    const { dom, plan } = ssrDocument(ROUTE_A)
    const doc = dom.window.document
    const head = createCompiledClient({ document: doc, scheduler: flush => flush() })
    head.push(plan)
    head.render()

    const component = head.push(toPlan({ meta: [{ name: 'description', content: 'Component says hi.' }] }))
    head.render()
    expect(doc.querySelectorAll('meta[name=description]')).toHaveLength(1)
    expect(doc.querySelector('meta[name=description]')!.getAttribute('content')).toBe('Component says hi.')

    component.dispose()
    head.render()
    expect(doc.querySelector('meta[name=description]')!.getAttribute('content')).toBe('How to install.')
  })
})
