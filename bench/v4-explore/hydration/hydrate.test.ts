/**
 * Correctness gate for the hydration strategies. A strategy that fails here
 * is disqualified regardless of bench numbers.
 *
 * Expected outcomes are strategy-specific and intentionally document the
 * known identity gaps:
 * - baseline/eager (hash adopt): base, alternate-hreflang and keyed metas
 *   duplicate (V4_DESIGN.md 12 known gap)
 * - exact (compile identity() port): base + alternate-hreflang fixed; keyed
 *   metas still duplicate (SSR HTML carries no key for metas)
 * - marker/manifest: everything adopts exactly
 * - noadopt: no duplicates, but scripts are re-created (re-executed in a real
 *   browser) and SSR-only defaults (charset, viewport) are lost: disqualified
 *   for script/style/link-stylesheet workloads
 */
import { gzipSync } from 'node:zlib'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { createHead as createBaselineHead } from '../../../packages/unhead/src/v4/client'
import { renderSSRHead } from '../../../packages/unhead/src/v4/server'
import { applyPage } from '../../v4/fixtures'
import { createEagerHead, createExactHead, createManifestHead, createMarkerHead, createNoAdoptHead } from './clients'
import { renderSSRHeadManifest, renderSSRHeadMarked, renderSSRHeadRanged } from './servers'
import { EDGE_ENTRY, v4SSRPage } from './shared'

interface Strategy {
  name: string
  create: (opts: { document: Document, scheduler: (f: () => void) => void }) => { push: (i: any, o?: any) => any, render: () => boolean }
  render: Parameters<typeof v4SSRPage>[0]
  adopts: boolean
  /** expected element counts after hydrating the EDGE_ENTRY probes: [base, link[hreflang], meta[name=x-custom]] */
  edge: [number, number, number]
}

const STRATEGIES: Strategy[] = [
  { name: 'baseline (lazy hash adopt)', create: createBaselineHead as any, render: renderSSRHead, adopts: true, edge: [2, 2, 2] },
  { name: 'eager hash adopt', create: createEagerHead, render: renderSSRHead, adopts: true, edge: [2, 2, 2] },
  { name: 'exact identity adopt', create: createExactHead, render: renderSSRHead, adopts: true, edge: [1, 1, 2] },
  { name: 'marker attr adopt', create: createMarkerHead, render: renderSSRHeadMarked, adopts: true, edge: [1, 1, 1] },
  { name: 'manifest adopt', create: createManifestHead, render: renderSSRHeadManifest, adopts: true, edge: [1, 1, 1] },
  { name: 'no-adopt replace', create: createNoAdoptHead, render: renderSSRHeadRanged, adopts: false, edge: [1, 1, 1] },
]

function hydrate(s: Strategy, extra?: Record<string, any>) {
  const page = v4SSRPage(s.render, extra)
  const dom = new JSDOM(page.html)
  const doc = dom.window.document as unknown as Document
  const head = s.create({ document: doc, scheduler: () => {} })
  applyPage((input, opts) => head.push(input, opts))
  if (extra)
    head.push(extra)
  return { doc, head, page }
}

describe.each(STRATEGIES)('$name', (s) => {
  it('hydration flush adopts the SSR head without duplication', () => {
    const { doc, head } = hydrate(s)
    const before = {
      count: doc.head.childElementCount,
      analytics: doc.querySelector('script[data-hid="analytics"]'),
      module: doc.querySelector('script[src="/_nuxt/module.js"]'),
      legacy: doc.querySelector('script[src="/_nuxt/legacy.js"]'),
      entryCss: doc.querySelector('link[href="/entry.css"]'),
      payload: doc.querySelector('body script[type="application/json"]'),
    }
    expect(before.analytics).toBeTruthy()
    expect(before.module).toBeTruthy()

    head.render()

    expect(doc.title).toBe('About · Harlan Wilton')
    const desc = doc.querySelectorAll('meta[name="description"]')
    expect(desc.length).toBe(1)
    expect(desc[0].getAttribute('content')).toBe('About Harlan Wilton, open source developer.')
    expect(doc.querySelectorAll('link[rel="stylesheet"]').length).toBe(5)
    expect(doc.querySelectorAll('link[rel="canonical"]').length).toBe(1)
    expect(doc.querySelectorAll('script[data-hid="analytics"]').length).toBe(1)

    if (s.adopts) {
      // adopted, not re-created: same element references, head untouched
      expect(doc.head.childElementCount).toBe(before.count)
      expect(doc.querySelector('script[data-hid="analytics"]')).toBe(before.analytics)
      expect(doc.querySelector('script[src="/_nuxt/module.js"]')).toBe(before.module)
      expect(doc.querySelector('script[src="/_nuxt/legacy.js"]')).toBe(before.legacy)
      expect(doc.querySelector('link[href="/entry.css"]')).toBe(before.entryCss)
      expect(doc.querySelector('body script[type="application/json"]')).toBe(before.payload)
    }
    else {
      // disqualifier record: every script is a fresh node (a real browser
      // would re-execute analytics and re-fetch stylesheets), and SSR-only
      // defaults (charset, viewport) the client never pushes are lost
      expect(doc.querySelector('script[data-hid="analytics"]')).not.toBe(before.analytics)
      expect(doc.querySelector('script[src="/_nuxt/module.js"]')).not.toBe(before.module)
      expect(doc.querySelector('meta[charset]')).toBeNull()
      expect(doc.querySelector('meta[name="viewport"]')).toBeNull()
      expect(doc.head.childElementCount).toBe(before.count - 2)
    }
  })

  it('identity gap probes: base / alternate-hreflang / keyed meta', () => {
    const { doc, head } = hydrate(s, EDGE_ENTRY)
    head.render()
    expect([
      doc.querySelectorAll('base').length,
      doc.querySelectorAll('link[hreflang]').length,
      doc.querySelectorAll('meta[name="x-custom"]').length,
    ]).toEqual(s.edge)
  })

  it('second flush stays stable (title patch, no duplication)', () => {
    const { doc, head } = hydrate(s)
    head.render()
    const entry = head.push({ title: 'Changed' })
    head.render()
    expect(doc.title).toBe('Changed · Harlan Wilton')
    expect(doc.querySelectorAll('title').length).toBe(1)
    expect(doc.querySelectorAll('meta[name="description"]').length).toBe(1)
    entry.dispose()
    head.render()
    expect(doc.title).toBe('About · Harlan Wilton')
  })
})

it('ssr byte overhead of marker strategies', () => {
  const base = v4SSRPage(renderSSRHead)
  const marked = v4SSRPage(renderSSRHeadMarked)
  const manifest = v4SSRPage(renderSSRHeadManifest)
  const ranged = v4SSRPage(renderSSRHeadRanged)
  const gz = (s: string) => gzipSync(s).length
  const baseGz = gz(base.html)
  const rows = [
    ['baseline', base.bytes, 0, gz(base.html), 0],
    ['marker attr (data-h)', marked.bytes, marked.bytes - base.bytes, gz(marked.html), gz(marked.html) - baseGz],
    ['manifest script', manifest.bytes, manifest.bytes - base.bytes, gz(manifest.html), gz(manifest.html) - baseGz],
    ['comment ranges', ranged.bytes, ranged.bytes - base.bytes, gz(ranged.html), gz(ranged.html) - baseGz],
  ] as const
  // eslint-disable-next-line no-console
  console.log(`\nSSR byte overhead (7-entry page, ${base.bytes} B / ${baseGz} B gz baseline):`)
  // eslint-disable-next-line no-console
  for (const [name, bytes, delta, gzb, gzd] of rows) console.log(`  ${name}: ${bytes} B (+${delta}) | gz ${gzb} B (+${gzd})`)
  expect(marked.bytes).toBeGreaterThan(base.bytes)
  expect(manifest.bytes).toBeGreaterThan(base.bytes)
  expect(ranged.bytes - base.bytes).toBeLessThan(60)
})
