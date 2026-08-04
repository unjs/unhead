/**
 * Correctness gates for the page-switch strategies:
 * 1. A->B->A leaves the document identical to a fresh mount of A.
 * 2. Every strategy (loose and sealed-plan paths) produces the same
 *    route-0 document state (dual-path law at the DOM level).
 * 3. Shared AND same-identity dynamic tags keep their element references
 *    across a navigation (no churn); scripts are never re-created.
 * 4. Steady-state navigation performs zero element creations/insertions/
 *    removals; the per-navigation DOM op counts are logged as a table.
 */
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { instrument } from './dom-ops'
import { BLANK, scenarios } from './routes'
import { strategies } from './strategies'

function norm(el: Element) {
  return `${el.tagName} ${el.getAttributeNames().sort().map(n => `${n}=${el.getAttribute(n)}`).join(' ')} :: ${el.innerHTML}`
}

function domState(doc: Document) {
  return {
    title: doc.title,
    htmlAttrs: doc.documentElement.getAttributeNames().sort().map(n => `${n}=${doc.documentElement.getAttribute(n)}`),
    bodyAttrs: doc.body.getAttributeNames().sort().map(n => `${n}=${doc.body.getAttribute(n)}`),
    head: [...doc.head.children].filter(el => el.tagName !== 'TITLE').map(norm).sort(),
    body: [...doc.body.children].filter(el => el.tagName !== 'DIV').map(norm).sort(),
  }
}

const names = Object.keys(strategies)

for (const sc of Object.values(scenarios)) {
  describe(`nav: ${sc.name}`, () => {
    for (const name of names) {
      it(`${name}: A->B->A equals a fresh mount of A`, () => {
        const dom = new JSDOM(BLANK)
        const doc = dom.window.document
        const c = strategies[name](doc, sc)
        const fresh = domState(doc)
        c.nav(1)
        c.nav(0)
        expect(domState(doc)).toEqual(fresh)
      })
    }

    it('all strategies produce identical route-0 document state', () => {
      const states = names.map((name) => {
        const dom = new JSDOM(BLANK)
        strategies[name](dom.window.document, sc)
        return [name, domState(dom.window.document)] as const
      })
      for (const [name, state] of states.slice(1))
        expect(state, `${name} vs ${states[0][0]}`).toEqual(states[0][1])
    })

    for (const name of names) {
      it(`${name}: element identity is stable across navigation; scripts never re-created`, () => {
        const dom = new JSDOM(BLANK)
        const doc = dom.window.document
        const c = strategies[name](doc, sc)
        const analytics = doc.querySelector('script[data-hid="analytics"]')
        const stylesheet = doc.querySelector('link[rel="stylesheet"]')
        const robots = doc.querySelector('meta[name="robots"]')
        const siteName = doc.querySelector('meta[property="og:site_name"]')
        const description = doc.querySelector('meta[name="description"]')
        const canonical = doc.querySelector('link[rel="canonical"]')
        const scripts = [...doc.querySelectorAll('script')]
        expect(analytics).toBeTruthy()
        expect(scripts.length).toBe(3)

        c.nav(1)
        c.nav(0)
        c.nav(1)

        // shared tags: same element references, attributes untouched
        expect(doc.querySelector('script[data-hid="analytics"]')).toBe(analytics)
        expect(doc.querySelector('link[rel="stylesheet"]')).toBe(stylesheet)
        expect(doc.querySelector('meta[name="robots"]')).toBe(robots)
        expect(doc.querySelector('meta[property="og:site_name"]')).toBe(siteName)
        // dynamic tags with a stable identity: element reused, only attrs change
        expect(doc.querySelector('meta[name="description"]')).toBe(description)
        expect(doc.querySelector('link[rel="canonical"]')).toBe(canonical)
        expect(doc.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(sc.routes[1].description)
        // scripts: same set, never re-created
        const after = [...doc.querySelectorAll('script')]
        expect(after.length).toBe(3)
        for (let i = 0; i < scripts.length; i++) expect(after[i]).toBe(scripts[i])
      })
    }

    it('steady-state navigation: zero element churn; dom ops per navigation', () => {
      const rows: string[] = []
      for (const name of names) {
        const dom = new JSDOM(BLANK)
        const ops = instrument(dom.window)
        const c = strategies[name](dom.window.document, sc)
        // warm one full cycle so lazily-created elements (e.g. <title>) exist
        for (let i = 1; i <= sc.routes.length; i++) c.nav(i % sc.routes.length)
        ops.reset()
        const navs = sc.routes.length === 2 ? 2 : sc.routes.length
        for (let i = 1; i <= navs; i++) c.nav(i % sc.routes.length)
        const s = ops.snap()
        expect(s.create, `${name} created elements`).toBe(0)
        expect(s.insert, `${name} inserted elements`).toBe(0)
        expect(s.remove, `${name} removed elements`).toBe(0)
        expect(s.class + s.style, `${name} class/style ops`).toBe(0)
        const per = (n: number) => (n / navs).toFixed(1).padStart(7)
        rows.push(`${name.padEnd(14)}${per(s.setAttr)}${per(s.removeAttr)}${per(s.content)}${per(s.title)}${per(ops.total())}`)
      }
      const header = `${'strategy'.padEnd(14)}${'setAttr'.padStart(7)}${'rmAttr'.padStart(7)}${'content'.padStart(7)}${'title'.padStart(7)}${'total'.padStart(7)}`
      // eslint-disable-next-line no-console
      console.log(`\nDOM ops per navigation [${sc.name}]\n${header}\n${rows.join('\n')}\n`)
    })
  })
}
