/**
 * Page-switch architecture bench: one iteration = one full navigation
 * (replace route A's head entries with route B's, single flush, DOM diff).
 * DOM-op counts live in nav.test.ts; this file measures throughput only.
 */
import { JSDOM } from 'jsdom'
import { bench, describe } from 'vitest'
import { BLANK, scenarios } from './routes'
import { strategies, v3Strategies } from './strategies'

for (const [key, sc] of Object.entries(scenarios)) {
  describe(`nav: ${sc.name}`, () => {
    const all = key === 'typical' ? { ...strategies, ...v3Strategies } : strategies
    for (const [name, make] of Object.entries(all)) {
      const dom = new JSDOM(BLANK)
      const c = make(dom.window.document, sc)
      const n = sc.routes.length
      let i = 1
      bench(name, () => {
        c.nav(i)
        i = (i + 1) % n
      })
    }
  })
}
