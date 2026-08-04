/**
 * Route fixtures for the page-switch architecture exploration.
 *
 * A 7-entry page: 5 layout entries that never change across navigation
 * (17 tags) and 2 route entries (9 tags: title, description, canonical,
 * og:title/description/url/image/image:alt, twitter:image), so ~65% of tags
 * are shared between routes. The blog scenario shrinks the dynamic set to
 * title + description + canonical (3 tags).
 *
 * Every scenario is expressed twice: loose entries (runtime compile path)
 * and sealed plans (build-time emit path), asserted equal in nav.test.ts.
 */
import type { EntryOptions, PlanTag } from '../../../packages/unhead/src/v4/core'
import { emitRoutePlan, hole } from '../../../packages/unhead/src/v4/emit'

export interface RouteData {
  title: string
  description: string
  path: string
  image: string
}

export function route(i: number): RouteData {
  return {
    title: `Page ${i}`,
    description: `All about page ${i}, an in-depth exploration of topic ${i}.`,
    path: `https://harlanzw.com/pages/${i}`,
    image: `https://harlanzw.com/__og-image__/page-${i}.png`,
  }
}

export const TITLE_SUFFIX = ' · Harlan Wilton'

type LooseEntry = [Record<string, any>, EntryOptions?]

// ---- layout (shared across every route) -----------------------------------

const L_APP: LooseEntry = [{
  htmlAttrs: { lang: 'en', class: 'dark' },
  script: [{ 'src': 'https://analytics.example.com/script.js', 'data-site': 'VDJUVDNA', 'defer': true, 'key': 'analytics' }],
}]
const L_ASSETS: LooseEntry = [{
  link: [
    { rel: 'stylesheet', href: '/entry.css' },
    { rel: 'stylesheet', href: '/page.css' },
    { rel: 'preload', as: 'script', href: '/_nuxt/app.js' },
    { rel: 'preload', as: 'fetch', href: '/payload.json', crossorigin: '' },
  ],
}]
const L_BODY: LooseEntry = [{
  script: [
    { type: 'module', src: '/_nuxt/module.js', crossorigin: '' },
    { src: '/_nuxt/legacy.js', defer: true, crossorigin: '' },
  ],
}, { tagPosition: 'bodyClose' }]
// loose path resolves the template at runtime; the plan path bakes it into
// the route plan's title tuple, so its plan twin below omits titleTemplate
const L_SITE_LOOSE: LooseEntry = [{
  titleTemplate: `%s${TITLE_SUFFIX}`,
  bodyAttrs: { class: 'antialiased font-sans' },
  meta: [{ name: 'robots', content: 'index, follow' }],
}, { tagPriority: 101 }]
const L_SITE_PLAN: LooseEntry = [{
  bodyAttrs: { class: 'antialiased font-sans' },
  meta: [{ name: 'robots', content: 'index, follow' }],
}, { tagPriority: 101 }]
const L_OG_STATIC: LooseEntry = [{
  meta: [
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'Harlan Wilton' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: '@harlan_zw' },
  ],
}]

export const LAYOUT_LOOSE: LooseEntry[] = [L_APP, L_ASSETS, L_BODY, L_SITE_LOOSE, L_OG_STATIC]
const LAYOUT_PLAN_ENTRIES: LooseEntry[] = [L_APP, L_ASSETS, L_BODY, L_SITE_PLAN, L_OG_STATIC]

// ---- per-route inputs (loose) ----------------------------------------------

export function seoInput(r: RouteData): Record<string, any> {
  return {
    title: r.title,
    meta: [{ name: 'description', content: r.description }],
    link: [{ rel: 'canonical', href: r.path }],
  }
}

export function ogInput(r: RouteData): Record<string, any> {
  return {
    meta: [
      { property: 'og:title', content: r.title },
      { property: 'og:description', content: r.description },
      { property: 'og:url', content: r.path },
      { property: 'og:image', content: r.image },
      { property: 'og:image:alt', content: `${r.title} cover` },
      { name: 'twitter:image', content: r.image },
    ],
  }
}

// ---- per-route sealed plans (build-time emit path) --------------------------

interface RoutePlanSpec {
  plan: PlanTag[]
  fills: (r: RouteData) => unknown[]
  fresh: () => PlanTag[]
}

function makeRoutePlanSpec(ogDynamic: boolean): RoutePlanSpec {
  // hole creation order = input traversal order (meta array, then link)
  const meta: Record<string, any>[] = [{ name: 'description', content: hole() }]
  const vals: ((r: RouteData) => unknown)[] = [r => r.description]
  if (ogDynamic) {
    meta.push(
      { property: 'og:title', content: hole() },
      { property: 'og:description', content: hole() },
      { property: 'og:url', content: hole() },
      { property: 'og:image', content: hole() },
      { property: 'og:image:alt', content: hole() },
      { name: 'twitter:image', content: hole() },
    )
    vals.push(r => r.title, r => r.description, r => r.path, r => r.image, r => `${r.title} cover`, r => r.image)
  }
  const input = { meta, link: [{ rel: 'canonical', href: hole() }] }
  vals.push(r => r.path)
  const res = emitRoutePlan([[input]])
  // the bundler knows the site titleTemplate statically and bakes it into the
  // title tuple's segments; the fill stays the raw route title
  const plan: PlanTag[] = [[10, 'title', ['<title>', `${TITLE_SUFFIX}</title>`], 0], ...res.plan]
  const fills = (r: RouteData) => [r.title, ...res.fillOrder.map(ci => vals[ci](r))]
  return { plan, fills, fresh: () => plan.map(t => t.slice() as PlanTag) }
}

// ---- scenarios ---------------------------------------------------------------

export interface Scenario {
  name: string
  routes: RouteData[]
  /** pushed once at app boot (loose strategies) */
  looseStatic: LooseEntry[]
  /** the entries a navigation replaces (loose strategies) */
  looseDynamic: (r: RouteData) => LooseEntry[]
  /** pushed once at app boot (plan strategies) */
  planStatic: PlanTag[]
  /** the ONE shared route-plan shape (fills-only strategy) */
  routePlan: PlanTag[]
  /** a distinct plan instance, as a bundler emits one const per route (plan-swap) */
  freshRoutePlan: () => PlanTag[]
  fills: (r: RouteData) => unknown[]
}

function makeScenario(name: string, n: number, ogDynamic: boolean): Scenario {
  const routes = Array.from({ length: n }, (_, i) => route(i))
  const spec = makeRoutePlanSpec(ogDynamic)
  const planStaticEntries = ogDynamic ? LAYOUT_PLAN_ENTRIES : [...LAYOUT_PLAN_ENTRIES, [ogInput(routes[0])] as LooseEntry]
  return {
    name,
    routes,
    looseStatic: ogDynamic ? LAYOUT_LOOSE : [...LAYOUT_LOOSE, [ogInput(routes[0])]],
    looseDynamic: r => ogDynamic ? [[seoInput(r)], [ogInput(r)]] : [[seoInput(r)]],
    planStatic: emitRoutePlan(planStaticEntries).plan,
    routePlan: spec.plan,
    freshRoutePlan: spec.fresh,
    fills: spec.fills,
  }
}

export const scenarios: Record<string, Scenario> = {
  typical: makeScenario('typical 7-entry ping-pong', 2, true),
  blog: makeScenario('blog: only title+description+canonical change', 2, false),
  many: makeScenario('20 distinct routes cycled', 20, true),
}

export const BLANK = '<!DOCTYPE html><html><head></head><body><div id="app"><h1>hello</h1></div></body></html>'
