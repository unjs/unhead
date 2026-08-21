/**
 * Candidate 2 perf: full-page SSR render, v4 propsToString vs vue's
 * ssrRenderAttrs behind the serializer seam (includes the honest shape
 * conversion glue the swap requires).
 */
import { bench, describe } from 'vitest'
import { createHead as createV4, renderSSRHead as renderV4 } from '../../../packages/unhead/src/v4/server'
import { applyPage } from '../../v4/fixtures'
import { renderSSRHead as renderSeamDefault, renderSSRHeadWith } from './proto/server-seam'
import { vueSerializer } from './proto/vue-attrs'

function head() {
  const h = createV4()
  applyPage((input, opts) => h.push(input, opts))
  h.resolve() // warm entry caches; the bench isolates serialization
  return h
}

describe('ssr typical page: serializer comparison', () => {
  const a = head()
  bench('v4 propsToString (v4/server)', () => {
    renderV4(a)
  })

  const b = head()
  bench('seam + default serializer', () => {
    renderSeamDefault(b)
  })

  const c = head()
  bench('seam + vue ssrRenderAttrs serializer', () => {
    renderSSRHeadWith(c, vueSerializer)
  })
})
