import { bench, describe } from 'vitest'
import { createHead as createV3, renderSSRHead as renderV3 } from '../packages/unhead/src/server'
import { createHead as createV4, renderSSRHead as renderV4 } from '../packages/unhead/src/v4/server'
import { applyPage, DYNAMIC_ENTRIES, SEALED_FILLS, SEALED_PAGE_PLAN, SIMPLE, STATIC_PLANS } from './v4/fixtures'

// full request lifecycle: createHead + push entries + render payload
describe('ssr typical page e2e', () => {
  bench('v3 runtime', () => {
    const head = createV3()
    applyPage((input, opts) => head.push(input, opts))
    renderV3(head, { omitLineBreaks: true })
  })
  bench('v4 runtime objects', () => {
    const head = createV4()
    applyPage((input, opts) => head.push(input, opts))
    renderV4(head)
  })
  bench('v4 compiled plans + dynamic tail', () => {
    const head = createV4()
    for (const plan of STATIC_PLANS) head.push(plan)
    for (const [input, opts] of DYNAMIC_ENTRIES) head.push(input, opts)
    renderV4(head)
  })
  bench('v4 sealed route plan (holes)', () => {
    const head = createV4()
    head.push(SEALED_PAGE_PLAN, { fills: SEALED_FILLS })
    renderV4(head)
  })
})

describe('ssr simple e2e', () => {
  bench('v3 runtime', () => {
    const head = createV3()
    head.push(SIMPLE)
    renderV3(head, { omitLineBreaks: true })
  })
  bench('v4 runtime objects', () => {
    const head = createV4()
    head.push(SIMPLE)
    renderV4(head)
  })
})

// render-only: entries pushed once, resolve+render repeatedly (multi-render server caching N/A here,
// but isolates resolve+stringify cost from push/compile)
describe('ssr resolve+render only', () => {
  const v3Head = createV3()
  applyPage((input, opts) => v3Head.push(input, opts))
  const v4Head = createV4()
  applyPage((input, opts) => v4Head.push(input, opts))

  bench('v3', () => {
    renderV3(v3Head, { omitLineBreaks: true })
  })
  bench('v4', () => {
    renderV4(v4Head)
  })
})
