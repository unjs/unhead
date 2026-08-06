/**
 * Size-only report (no CPU timing) for the route-level premerge prototype.
 * Compares generated code weight for three build-time strategies over the
 * same guaranteed route sources (app shell, docs layout, route rule, page):
 *
 *  1. loose     — today's shape: raw objects serialized into the bundle,
 *                 each requiring a full L1 compile + runtime head.push at
 *                 request time (what Nuxt's #build/nuxt.config.mjs does now).
 *  2. per-site  — V4PlanTransform's existing behaviour: each useHead()
 *                 call site compiled independently via emitEntryPlan, N
 *                 separate plan constants and N push() calls.
 *  3. premerged — this investigation's emitRouteHead: one plan constant,
 *                 one push() call, guaranteed sources folded with true d/w
 *                 so runtime overrides still dedupe correctly.
 *  4. prerender — emitRouteHead(..., { prerender: true }) on a route with
 *                 zero holes: folds straight to a final SSR payload, no
 *                 plan, no runtime head call needed at all client-side.
 *
 * Run: npx vitest run bench/v4-route-premerge-sizes.report.test.ts
 */
import { gzipSync } from 'node:zlib'
import { describe, it } from 'vitest'
import { emitEntryPlan, emitRouteHead, planToCode } from '../packages/unhead/src/v4/emit'

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

const ROUTE_A = [
  { source: 'app' as const, input: APP },
  { source: 'layout' as const, input: LAYOUT_DOCS },
  { source: 'route-rule' as const, input: RULE },
  { source: 'page' as const, input: PAGE_A },
]

function gz(s: string) {
  return gzipSync(s, { level: 9 }).length
}

describe('route premerge: generated-code size report (no CPU timing)', () => {
  it('reports raw / per-site / premerged / prerendered code weight', () => {
    // 1. loose: raw objects, as Nuxt writes appHead into #build today, plus
    //    per-source runtime push() calls (no compiler involvement at all).
    const looseSources = [APP, LAYOUT_DOCS, RULE, PAGE_A]
    const looseCode = looseSources.map((s, i) => `const s${i} = ${JSON.stringify(s)}\nhead.push(s${i})`).join('\n')

    // 2. per-site: what V4PlanTransform emits today, one useHead() call at a
    //    time, with no knowledge that these four call sites share a route.
    const perSiteCode = looseSources
      .map((s, i) => {
        const emitted = emitEntryPlan(s)
        return `const p${i} = ${planToCode(emitted.plan)}\nhead.push(p${i})`
      })
      .join('\n')

    // 3. premerged: this investigation's emitRouteHead, route sources folded
    //    into one plan with true d/w (runtime entries still override it).
    const premerged = emitRouteHead(ROUTE_A)
    if (premerged.kind !== 'plan')
      throw new Error(`expected plan, got ${premerged.kind}`)
    const premergedCode = `const p = ${premerged.code}\nhead.push(p)`

    // 4. prerender: same sources, route proven fully static and hole-free,
    //    folds straight to a final payload. No plan, no push(), no runtime.
    const prerendered = emitRouteHead(ROUTE_A, { prerender: true })
    if (prerendered.kind !== 'payload')
      throw new Error(`expected payload, got ${prerendered.kind}`)
    const prerenderedCode = prerendered.code

    const rows = [
      ['loose (today: raw objects + N runtime pushes)', looseCode, gz(looseCode)],
      ['per-site compiled (V4PlanTransform, N plans)', perSiteCode, gz(perSiteCode)],
      ['route-premerged (emitRouteHead, 1 plan)', premergedCode, gz(premergedCode)],
      ['prerendered payload (emitRouteHead prerender:true, 0 runtime calls)', prerenderedCode, gz(prerenderedCode)],
    ] as const

    // eslint-disable-next-line no-console
    console.log('\nRoute source code weight (gzip -9, generated code only, excludes shared runtime import cost):')
    for (const [label, code, size] of rows)
      // eslint-disable-next-line no-console
      console.log(`  ${label.padEnd(58)} raw=${String(code.length).padStart(5)}B gz=${String(size).padStart(4)}B`)

    const loose = rows[0][2]
    const perSite = rows[1][2]
    const premergedGz = rows[2][2]
    // eslint-disable-next-line no-console
    console.log(`\nDelta vs loose:      per-site ${(100 * (1 - perSite / loose)).toFixed(1)}%, premerged ${(100 * (1 - premergedGz / loose)).toFixed(1)}%`)
    // eslint-disable-next-line no-console
    console.log(`Delta per-site -> premerged: ${(100 * (1 - premergedGz / perSite)).toFixed(1)}% (dedupe across sources folds at build time instead of at every request)`)
    // eslint-disable-next-line no-console
    console.log(`Prerendered payload requires 0 B of head runtime client-side (no plan, no push, no compiled/runtime import at all).`)
  })
})
