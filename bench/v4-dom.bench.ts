import { JSDOM } from 'jsdom'
import { bench, describe } from 'vitest'
import { createHead as createV3 } from '../packages/unhead/src/client'
import { createHead as createV4 } from '../packages/unhead/src/v4/client'
import { applyPage } from './v4/fixtures'

const BLANK = '<!DOCTYPE html><html><head></head><body><div><h1>hello</h1></div></body></html>'

// hydration-style mount + dispose: v3 renders synchronously on every push
// (its real behavior); v4 batches to one flush (its real behavior)
describe('dom mount + dispose (typical page)', () => {
  const v3dom = new JSDOM(BLANK)
  bench('v3', () => {
    const head = createV3({ document: v3dom.window.document })
    const entries: any[] = []
    applyPage((input, opts) => entries.push(head.push(input, opts)))
    head.render()
    for (const e of entries) e.dispose()
    head.render()
  })
  const v4dom = new JSDOM(BLANK)
  bench('v4', () => {
    const head = createV4({ document: v4dom.window.document, scheduler: () => {} })
    const entries: any[] = []
    applyPage((input, opts) => entries.push(head.push(input, opts)))
    head.render()
    for (const e of entries) e.dispose()
    head.render()
  })
})

// spa navigation hot path: patch one entry, flush
describe('dom patch + rerender', () => {
  const v3dom = new JSDOM(BLANK)
  const v3head = createV3({ document: v3dom.window.document })
  applyPage((input, opts) => v3head.push(input, opts))
  const v3entry = v3head.push({ title: 'A', meta: [{ name: 'description', content: 'a' }] })
  let i3 = 0
  bench('v3', () => {
    v3entry.patch({ title: `A${i3++}`, meta: [{ name: 'description', content: `a${i3}` }] })
    v3head.render()
  })

  const v4dom = new JSDOM(BLANK)
  const v4head = createV4({ document: v4dom.window.document, scheduler: () => {} })
  applyPage((input, opts) => v4head.push(input, opts))
  const v4entry = v4head.push({ title: 'A', meta: [{ name: 'description', content: 'a' }] })
  let i4 = 0
  bench('v4', () => {
    v4entry.patch({ title: `A${i4++}`, meta: [{ name: 'description', content: `a${i4}` }] })
    v4head.render()
  })
})
