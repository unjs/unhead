// @vitest-environment jsdom
/**
 * Candidate 3 perf: one iteration = one navigation (patch the route entry,
 * flush to the DOM). v4 fx renderer vs @vue/runtime-dom vnode renderer.
 * NOTE: under vitest NODE_ENV=test vue runs its dev build; re-run with
 * NODE_ENV=production for the prod-build numbers quoted in RESEARCH.md.
 */
import { bench, describe } from 'vitest'
import { attachDom } from '../../../packages/unhead/src/v4/client'
import { compileEntry, TitlePlugin } from '../../../packages/unhead/src/v4/compile'
import { createCore } from '../../../packages/unhead/src/v4/core'
import { createVueDomRenderer } from './proto/vnode-client'
import { LAYOUT, routeEntry } from './route-fixture'

function makeV4() {
  const head = attachDom(createCore({ ssr: false, compile: compileEntry }), { document, scheduler: () => {} })
  head.use(TitlePlugin)
  head.push(LAYOUT)
  const entry = head.push(routeEntry(0))
  return (i: number) => {
    entry.patch(routeEntry(i))
    head.render()
  }
}

function makeVue() {
  const head = createCore({ ssr: false, compile: compileEntry })
  head.use(TitlePlugin)
  head.push(LAYOUT)
  const entry = head.push(routeEntry(0))
  const r = createVueDomRenderer()
  r.apply(head.resolve(), document)
  return (i: number) => {
    entry.patch(routeEntry(i))
    r.apply(head.resolve(), document)
  }
}

describe('nav loop: fx renderer vs vue vnode renderer', () => {
  const v4 = makeV4()
  let a = 1
  bench('v4 fx renderer', () => {
    v4(a)
    a = (a + 1) % 16
  })

  const vue = makeVue()
  let b = 1
  bench('vue vnode renderer', () => {
    vue(b)
    b = (b + 1) % 16
  })
})
