/**
 * Hydration architecture bench: page arrives SSR-rendered, the client head is
 * created, the app pushes the same 7 entries during boot, the first flush
 * must adopt the existing DOM. Three scenarios per strategy:
 *
 * 1. boot only: createHead, no push, no flush (a page that never mutates its
 *    head; the design's zero-work contract). Lazy strategies should be ~free,
 *    eager pays adoption here.
 * 2. hydrate: push the 7 SSR entries + first flush. Nothing in the DOM should
 *    change; this is the common hydration case. Every row resets the SSR
 *    head/body markup per iteration so no-adopt (which destroys the SSR
 *    elements) plays fair; the "dom reset only" row measures that shared
 *    constant so it can be subtracted.
 * 3. hydrate + patch: scenario 2 plus one title/description patch + second
 *    flush (first SPA mutation after boot).
 */
import { JSDOM } from 'jsdom'
import { bench, describe } from 'vitest'
import { createHead as createV3Head } from '../../../packages/unhead/src/client'
import { createHead as createBaselineHead } from '../../../packages/unhead/src/v4/client'
import { renderSSRHead } from '../../../packages/unhead/src/v4/server'
import { applyPage } from '../../v4/fixtures'
import { adoptExact, adoptHash, adoptManifest, adoptMarker, createEagerHead, createExactHead, createManifestHead, createMarkerHead, createNoAdoptHead } from './clients'
import { renderSSRHeadManifest, renderSSRHeadMarked, renderSSRHeadRanged } from './servers'
import { resetDoc, v3SSRPage, v4SSRPage } from './shared'

const PATCH = { title: 'Changed', meta: [{ name: 'description', content: 'changed' }] }

const V4_STRATEGIES = [
  { name: 'v4 baseline (lazy hash adopt)', create: createBaselineHead as any, page: v4SSRPage(renderSSRHead) },
  { name: 'v4 eager hash adopt', create: createEagerHead, page: v4SSRPage(renderSSRHead) },
  { name: 'v4 exact identity adopt', create: createExactHead, page: v4SSRPage(renderSSRHead) },
  { name: 'v4 marker attr adopt', create: createMarkerHead, page: v4SSRPage(renderSSRHeadMarked) },
  { name: 'v4 manifest adopt', create: createManifestHead, page: v4SSRPage(renderSSRHeadManifest) },
  { name: 'v4 no-adopt replace', create: createNoAdoptHead, page: v4SSRPage(renderSSRHeadRanged) },
]

const v3Page = v3SSRPage()

function newDoc(html: string): Document {
  return new JSDOM(html).window.document as unknown as Document
}

describe('boot only: createHead, no push, no flush', () => {
  {
    const doc = newDoc(v3Page.html)
    bench('v3 reference', () => {
      createV3Head({ document: doc as any })
    })
  }
  for (const s of V4_STRATEGIES) {
    const doc = newDoc(s.page.html)
    bench(s.name, () => {
      s.create({ document: doc, scheduler: () => {} })
    })
  }
})

// isolates the identity-map build, the only step that differs between the
// adopt strategies (the render pipeline is shared)
describe('adoption step only: build identity map from SSR DOM', () => {
  const plainDoc = newDoc(v4SSRPage(renderSSRHead).html)
  const markedDoc = newDoc(v4SSRPage(renderSSRHeadMarked).html)
  const manifestDoc = newDoc(v4SSRPage(renderSSRHeadManifest).html)
  bench('hash scan (baseline/eager)', () => {
    adoptHash(plainDoc, new Map())
  })
  bench('exact identity scan', () => {
    adoptExact(plainDoc, new Map())
  })
  bench('marker attr (querySelectorAll + attr read)', () => {
    adoptMarker(markedDoc, new Map())
  })
  bench('manifest (JSON parse + lockstep zip)', () => {
    adoptManifest(manifestDoc, new Map())
  })
})

// adopt strategies leave the DOM byte-identical when the client pushes the
// SSR entries, so the document can be reused across iterations: this is the
// clean boot+first-flush number without the reset constant. no-adopt cannot
// run here (it destroys the SSR elements it needs next iteration).
describe('hydrate, no reset: push 7 entries + first flush (adopt strategies)', () => {
  {
    const doc = newDoc(v3Page.html)
    bench('v3 reference', () => {
      const head = createV3Head({ document: doc as any })
      applyPage((input, opts) => head.push(input, opts))
      head.render()
    })
  }
  for (const s of V4_STRATEGIES) {
    if (s.name.includes('no-adopt'))
      continue
    const doc = newDoc(s.page.html)
    bench(s.name, () => {
      const head = s.create({ document: doc, scheduler: () => {} })
      applyPage((input: any, opts: any) => head.push(input, opts))
      head.render()
    })
  }
})

describe('hydrate: push 7 entries + first flush (same entries as SSR)', () => {
  {
    const doc = newDoc(v3Page.html)
    bench('dom reset only (shared per-iteration constant)', () => {
      resetDoc(doc, v3Page)
    })
  }
  {
    const doc = newDoc(v3Page.html)
    bench('v3 reference', () => {
      resetDoc(doc, v3Page)
      const head = createV3Head({ document: doc as any })
      applyPage((input, opts) => head.push(input, opts))
      head.render()
    })
  }
  for (const s of V4_STRATEGIES) {
    const doc = newDoc(s.page.html)
    bench(s.name, () => {
      resetDoc(doc, s.page)
      const head = s.create({ document: doc, scheduler: () => {} })
      applyPage((input: any, opts: any) => head.push(input, opts))
      head.render()
    })
  }
})

describe('hydrate + one entry patch + second flush', () => {
  {
    const doc = newDoc(v3Page.html)
    bench('v3 reference', () => {
      resetDoc(doc, v3Page)
      const head = createV3Head({ document: doc as any })
      const entries: any[] = []
      applyPage((input, opts) => entries.push(head.push(input, opts)))
      head.render()
      entries[entries.length - 1].patch(PATCH)
      head.render()
    })
  }
  for (const s of V4_STRATEGIES) {
    const doc = newDoc(s.page.html)
    bench(s.name, () => {
      resetDoc(doc, s.page)
      const head = s.create({ document: doc, scheduler: () => {} })
      const entries: any[] = []
      applyPage((input: any, opts: any) => entries.push(head.push(input, opts)))
      head.render()
      entries[entries.length - 1].patch(PATCH)
      head.render()
    })
  }
})
