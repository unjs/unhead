/**
 * Extra client renderer benches beyond v4-dom.bench.ts:
 * - no-op rerender: render() with nothing dirty must be ~free (dirty gate)
 * - 50 patches one flush: v4 batches all patches into a single render; the
 *   v3 comparison does 50 sync renders because that is its real behavior
 *   (every entries:updated triggers a DOM render)
 */
import { JSDOM } from 'jsdom'
import { bench, describe } from 'vitest'
import { createHead as createV3 } from '../packages/unhead/src/client'
import { createHead as createV4 } from '../packages/unhead/src/v4/client'
import { applyPage } from './v4/fixtures'

const BLANK = '<!DOCTYPE html><html><head></head><body><div><h1>hello</h1></div></body></html>'

describe('dom no-op rerender', () => {
  const v3dom = new JSDOM(BLANK)
  const v3head = createV3({ document: v3dom.window.document })
  applyPage((input, opts) => v3head.push(input, opts))
  v3head.render()
  bench('v3', () => {
    v3head.render()
  })

  const v4dom = new JSDOM(BLANK)
  const v4head = createV4({ document: v4dom.window.document, scheduler: () => {} })
  applyPage((input, opts) => v4head.push(input, opts))
  v4head.render()
  bench('v4', () => {
    v4head.render()
  })
})

describe('dom 50 patches one flush', () => {
  const v3dom = new JSDOM(BLANK)
  const v3head = createV3({ document: v3dom.window.document })
  applyPage((input, opts) => v3head.push(input, opts))
  const v3entry = v3head.push({ title: 'A', meta: [{ name: 'description', content: 'a' }] })
  let i3 = 0
  bench('v3 (50 sync renders, its real behavior)', () => {
    for (let n = 0; n < 50; n++) {
      v3entry.patch({ title: `A${i3++}`, meta: [{ name: 'description', content: `a${i3}` }] })
      v3head.render()
    }
  })

  const v4dom = new JSDOM(BLANK)
  const v4head = createV4({ document: v4dom.window.document, scheduler: () => {} })
  applyPage((input, opts) => v4head.push(input, opts))
  const v4entry = v4head.push({ title: 'A', meta: [{ name: 'description', content: 'a' }] })
  let i4 = 0
  bench('v4 (batched, one flush)', () => {
    for (let n = 0; n < 50; n++) v4entry.patch({ title: `A${i4++}`, meta: [{ name: 'description', content: `a${i4}` }] })
    v4head.render()
  })
})
