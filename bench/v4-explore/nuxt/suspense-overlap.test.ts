/**
 * Nuxt Suspense navigation overlap (NUXT_INTEGRATION.md point 5).
 *
 * With <Suspense>, the destination page's setup (and its useHead) runs BEFORE
 * the departing page unmounts; Nuxt even defers entry.dispose() until the
 * page transition promise settles (nuxt/dist/head/runtime/install-client-head.js).
 * The ordering the head must survive is therefore push-B-then-dispose-A:
 *   - while both entries are alive, the later entry wins dedupe at equal weight
 *   - disposing the old entry must not clobber the new entry's tags
 *   - DOM nodes shared by identity must persist (no remove+recreate flicker)
 */
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { createHead as createClientHead } from '../../../packages/unhead/src/v4/client'
import { createHead as createServerHead } from '../../../packages/unhead/src/v4/server'

const PAGE_A = {
  title: 'Page A',
  meta: [
    { name: 'description', content: 'A desc' },
    { property: 'og:image', content: ['https://a.example/1.png', 'https://a.example/2.png'] },
  ],
  htmlAttrs: { class: 'route-a' },
}

const PAGE_B = {
  title: 'Page B',
  meta: [
    { name: 'description', content: 'B desc' },
    { property: 'og:image', content: ['https://b.example/1.png'] },
  ],
  htmlAttrs: { class: 'route-b' },
}

const BLANK = '<!DOCTYPE html><html><head></head><body></body></html>'

function byD(head: ReturnType<typeof createServerHead>) {
  const map = new Map<string, any[]>()
  for (const t of head.resolve()) {
    if (t.f & (1 << 9)) // F_REMOVED
      continue
    const list = map.get(t.d) || []
    list.push(t)
    map.set(t.d, list)
  }
  return map
}

describe('suspense overlap: resolve semantics', () => {
  it('later entry wins while both alive; old dispose does not clobber new', () => {
    const head = createServerHead({ disableDefaults: true })
    const a = head.push(PAGE_A)
    // Suspense: B's useHead runs while A is still mounted
    const b = head.push(PAGE_B)

    // overlap window: B (later entry, equal weight) wins every contested identity
    let tags = byD(head)
    expect(tags.get('title')![0].c).toBe('Page B')
    expect(tags.get('meta:description')![0].p.content).toBe('B desc')
    // arrayable across entries: later entry replaces the whole set (v3 semantics)
    expect(tags.get('meta:og:image')!.map(t => t.p.content)).toEqual(['https://b.example/1.png'])
    // per-prop attr explosion: distinct identities union during the overlap
    expect(tags.has('htmlAttrs:class:route-a')).toBe(true)
    expect(tags.has('htmlAttrs:class:route-b')).toBe(true)

    // transition settles: A disposes AFTER B pushed
    a.dispose()
    tags = byD(head)
    expect(tags.get('title')![0].c).toBe('Page B')
    expect(tags.get('meta:description')![0].p.content).toBe('B desc')
    expect(tags.get('meta:og:image')!.map(t => t.p.content)).toEqual(['https://b.example/1.png'])
    expect(tags.has('htmlAttrs:class:route-a')).toBe(false)
    expect(tags.has('htmlAttrs:class:route-b')).toBe(true)

    b.dispose()
    expect(head.resolve()).toEqual([])
  })

  it('old entry patching during the overlap does not steal contested identities back', () => {
    const head = createServerHead({ disableDefaults: true })
    const a = head.push(PAGE_A)
    head.push(PAGE_B)
    // a lingering watchEffect on the departing page re-fires (entry seq is stable)
    a.patch({ ...PAGE_A, title: 'Page A v2' })
    expect(byD(head).get('title')![0].c).toBe('Page B')
    a.dispose()
    expect(byD(head).get('title')![0].c).toBe('Page B')
  })

  it('weighted old entry wins the overlap, dispose hands over to the new entry', () => {
    const head = createServerHead({ disableDefaults: true })
    const a = head.push({ title: 'Pinned A' }, { tagPriority: 'critical' })
    head.push({ title: 'Page B' })
    // lower weight beats later order while both are alive
    expect(byD(head).get('title')![0].c).toBe('Pinned A')
    a.dispose()
    expect(byD(head).get('title')![0].c).toBe('Page B')
  })
})

describe('suspense overlap: dom', () => {
  it('shared elements persist across push-B-then-dispose-A (no recreate)', () => {
    const doc = new JSDOM(BLANK).window.document
    const head = createClientHead({ document: doc })
    const a = head.push(PAGE_A)
    head.render()
    expect(doc.title).toBe('Page A')
    const descEl = doc.querySelector('meta[name=description]')!
    expect(descEl.getAttribute('content')).toBe('A desc')
    expect(doc.querySelectorAll('meta[property="og:image"]').length).toBe(2)

    // overlap render (Nuxt renders on app:suspense:resolve while A may still be alive)
    head.push(PAGE_B)
    head.render()
    expect(doc.title).toBe('Page B')
    // identity-shared node is the SAME element, updated in place
    expect(doc.querySelector('meta[name=description]')).toBe(descEl)
    expect(descEl.getAttribute('content')).toBe('B desc')
    // arrayable replace shrank the set; surplus element reclaimed
    const ogs = doc.querySelectorAll('meta[property="og:image"]')
    expect(ogs.length).toBe(1)
    expect(ogs[0].getAttribute('content')).toBe('https://b.example/1.png')
    expect(doc.documentElement.classList.contains('route-a')).toBe(true)
    expect(doc.documentElement.classList.contains('route-b')).toBe(true)

    // deferred dispose (transition promise settled)
    a.dispose()
    head.render()
    expect(doc.title).toBe('Page B')
    expect(doc.querySelector('meta[name=description]')).toBe(descEl)
    expect(descEl.getAttribute('content')).toBe('B desc')
    expect(doc.querySelectorAll('meta[property="og:image"]').length).toBe(1)
    expect(doc.documentElement.classList.contains('route-a')).toBe(false)
    expect(doc.documentElement.classList.contains('route-b')).toBe(true)
  })

  it('push-B + dispose-A inside one tick batches to a single flush with the merged state', () => {
    const doc = new JSDOM(BLANK).window.document
    let scheduled: (() => void) | null = null
    let schedules = 0
    const head = createClientHead({
      document: doc,
      scheduler: (flush) => {
        schedules++
        scheduled = flush
      },
    })
    const a = head.push(PAGE_A)
    scheduled!()
    expect(doc.title).toBe('Page A')

    schedules = 0
    head.push(PAGE_B)
    a.dispose()
    // both mutations coalesce into the one scheduled flush
    expect(schedules).toBe(1)
    expect(doc.title).toBe('Page A') // nothing rendered yet
    scheduled!()
    expect(doc.title).toBe('Page B')
    expect(doc.querySelector('meta[name=description]')!.getAttribute('content')).toBe('B desc')
    expect(doc.documentElement.classList.contains('route-a')).toBe(false)
  })
})
