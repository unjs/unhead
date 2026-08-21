import { bench, describe } from 'vitest'
import { emitSSRRoutePlan, hole } from '../packages/unhead/src/v4/emit'
import { createHead, renderSSRHead } from '../packages/unhead/src/v4/server'
import { renderSSRRoutePlan } from '../packages/unhead/src/v4/server-plans'
import { ENTRIES } from './v4/fixtures'

const staticPlan = emitSSRRoutePlan(ENTRIES.map(([input, opts]) => [input, opts])).plan
const dynamicEntries = ENTRIES.map(([input, opts]) => [{ ...input }, opts] as [Record<string, any>, typeof opts])
delete dynamicEntries[4][0].titleTemplate
dynamicEntries[6][0] = {
  title: hole(),
  meta: [{ name: 'description', content: hole() }],
}
const dynamicPlan = emitSSRRoutePlan(dynamicEntries).plan
const dynamicFills = ['About', 'About Harlan Wilton, open source developer.']

describe('sealed route SSR', () => {
  bench('stateful core, static route plan', () => {
    const head = createHead()
    head.push(staticPlan)
    renderSSRHead(head)
  })

  bench('direct, static route plan', () => {
    renderSSRRoutePlan(staticPlan)
  })

  bench('stateful core, route plan with holes', () => {
    const head = createHead()
    head.push(dynamicPlan, { fills: dynamicFills })
    renderSSRHead(head)
  })

  bench('direct, route plan with holes', () => {
    renderSSRRoutePlan(dynamicPlan, dynamicFills)
  })
})
