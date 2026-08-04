// @vitest-environment jsdom
/**
 * Candidate 3 correctness/efficiency: per-navigation DOM op counts,
 * v4 fx renderer vs vue vnode renderer, on the same workload. Reuses the
 * nav explore's live-document instrumentation.
 */
import { describe, expect, it } from 'vitest'
import { attachDom } from '../../../packages/unhead/src/v4/client'
import { compileEntry, TitlePlugin } from '../../../packages/unhead/src/v4/compile'
import { createCore } from '../../../packages/unhead/src/v4/core'
import { instrument } from '../nav/dom-ops'
import { createVueDomRenderer } from './proto/vnode-client'
import { LAYOUT, routeEntry } from './route-fixture'

describe('per-nav DOM ops', () => {
  it('both renderers converge to attr/content patches; vue adds no DOM efficiency', () => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''

    // v4 path
    const v4 = attachDom(createCore({ ssr: false, compile: compileEntry }), { document, scheduler: () => {} })
    v4.use(TitlePlugin)
    v4.push(LAYOUT)
    const v4Entry = v4.push(routeEntry(0))
    v4.render()

    const ops = instrument(window)
    v4Entry.patch(routeEntry(1))
    v4.render()
    const v4Ops = ops.snap()
    const v4Total = ops.total()

    // reset document for the vue path
    ops.reset()
    document.head.innerHTML = ''
    document.title = ''
    const core = createCore({ ssr: false, compile: compileEntry })
    core.use(TitlePlugin)
    core.push(LAYOUT)
    const vueEntry = core.push(routeEntry(0))
    const r = createVueDomRenderer()
    r.apply(core.resolve(), document)

    ops.reset()
    vueEntry.patch(routeEntry(1))
    r.apply(core.resolve(), document)
    const vueOps = ops.snap()
    const vueTotal = ops.total()

    // Steady-state nav on this workload is 5 attr writes + 1 title write for
    // v4. vue patches the same 5 values but mostly through DOM property
    // setters (el.content = x via shouldSetAsProp), which the setAttribute
    // wrapper cannot see, hence its lower setAttr count. Same mutation work,
    // different write mechanism.
    expect(v4Ops.create).toBe(0) // v4 reuses every element
    expect(vueOps.create).toBe(0) // so does vue when keys are stable
    expect(v4Ops.title).toBe(1)
    expect(vueOps.title).toBe(1)
    expect(v4Ops.remove).toBe(0)
    expect(vueOps.remove).toBe(0)
    // neither renderer should be doing more than attr updates on nav
    expect(v4Total).toBeLessThanOrEqual(8)
    expect(vueTotal).toBeLessThanOrEqual(8)
    // eslint-disable-next-line no-console
    console.log('per-nav ops', { v4: v4Ops, vue: vueOps })
  })
})
