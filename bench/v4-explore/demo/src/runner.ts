/**
 * In-page measurement harness, shared by all three demo pages.
 *
 * hydrate: performance.mark around createHead + 7 entry pushes + flush.
 * navigation: 50 simulated page switches alternating two route states,
 * timed with performance.now (per switch and around the whole loop; Chromium
 * quantizes performance.now to ~100us, so the loop total / 50 is the honest
 * per-switch figure). DOM mutations are counted via a MutationObserver on
 * document.head (childList + attributes + subtree + characterData; the
 * characterData bit is needed to see title text swaps) using takeRecords()
 * after each synchronous switch.
 */

import { SWITCHES } from './entries'

export interface Impl {
  label: string
  /** Runs the full hydration (createHead + pushes + flush); returns nav(toRouteB). */
  hydrate: () => (toRouteB: boolean) => void
}

function round(n: number, dp = 3): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

export function run(impl: Impl): void {
  const headEl = document.head
  const headChildrenBefore = headEl.children.length

  const mo = new MutationObserver(() => {})
  mo.observe(headEl, { childList: true, attributes: true, subtree: true, characterData: true })

  performance.mark('unhead:hydrate:start')
  const nav = impl.hydrate()
  performance.mark('unhead:hydrate:end')
  const hydrateMs = performance.measure('unhead:hydrate', 'unhead:hydrate:start', 'unhead:hydrate:end').duration
  const hydrateMutations = mo.takeRecords().length
  const headChildrenAfter = headEl.children.length

  const switchMs: number[] = []
  const switchMutations: number[] = []
  let mutationsTotal = 0
  const loopStart = performance.now()
  for (let i = 0; i < SWITCHES; i++) {
    const toB = i % 2 === 0
    const t0 = performance.now()
    nav(toB)
    switchMs.push(round(performance.now() - t0))
    const n = mo.takeRecords().length
    switchMutations.push(n)
    mutationsTotal += n
  }
  const navTotalMs = performance.now() - loopStart
  mo.disconnect()

  const results = {
    label: impl.label,
    hydrateMs: round(hydrateMs),
    hydrateMutations,
    headChildrenBefore,
    headChildrenAfter,
    switches: SWITCHES,
    navTotalMs: round(navTotalMs),
    navAvgMs: round(navTotalMs / SWITCHES, 4),
    mutationsTotal,
    mutationsPerSwitch: round(mutationsTotal / SWITCHES, 2),
    finalTitle: document.title,
    switchMs,
    switchMutations,
  }

  ;(window as any).__RESULTS__ = results
  ;(window as any).__NAV__ = nav // manual poking + mutation forensics

  const el = document.getElementById('results')
  if (el) {
    el.textContent = [
      `impl                ${results.label}`,
      `hydrate             ${results.hydrateMs} ms  (${hydrateMutations} head mutations, head children ${headChildrenBefore} -> ${headChildrenAfter})`,
      `page switches       ${SWITCHES} total ${results.navTotalMs} ms, avg ${results.navAvgMs} ms/switch`,
      `head mutations      ${mutationsTotal} total, ${results.mutationsPerSwitch}/switch`,
      `final title         ${results.finalTitle}`,
      '',
      JSON.stringify({ switchMs: results.switchMs, switchMutations: results.switchMutations }),
    ].join('\n')
  }
  ;(window as any).__DONE__ = true
}
