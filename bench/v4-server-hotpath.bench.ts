import { bench, describe } from 'vitest'
import { compileEntry } from '../packages/unhead/src/v4/compile'
import { createHead, propsToString, renderSSRHead, tagToHtml } from '../packages/unhead/src/v4/server'
import { applyPage, ENTRIES } from './v4/fixtures'

const BATCH = 20

describe('v4 server hot path', () => {
  bench('compileEntry typical entries x20', () => {
    for (let n = 0; n < BATCH; n++) {
      for (let i = 0; i < ENTRIES.length; i++)
        compileEntry(ENTRIES[i][0], i + 1, ENTRIES[i][1] || null)
    }
  }, { time: 1500, warmupTime: 500 })

  bench('fresh resolve typical page x20', () => {
    for (let n = 0; n < BATCH; n++) {
      const head = createHead()
      applyPage((input, opts) => head.push(input, opts))
      head.resolve()
    }
  }, { time: 1500, warmupTime: 500 })

  const cached = createHead()
  applyPage((input, opts) => cached.push(input, opts))
  cached.resolve()

  bench('cached resolve typical page x20', () => {
    for (let n = 0; n < BATCH; n++) cached.resolve()
  }, { time: 1500, warmupTime: 500 })

  bench('cached resolve + render typical page x20', () => {
    for (let n = 0; n < BATCH; n++) renderSSRHead(cached)
  }, { time: 1500, warmupTime: 500 })

  const tags = cached.resolve().filter(t => !(t.f & 512) && (t.f & 15) < 7)
  bench('tagToHtml resolved tags x20', () => {
    for (let n = 0; n < BATCH; n++) {
      for (let i = 0; i < tags.length; i++) tagToHtml(tags[i])
    }
  }, { time: 1500, warmupTime: 500 })

  const attrs = {
    'class': new Set(['dark', 'compact']),
    'style': new Map([['color', 'red'], ['font-size', '14px']]),
    'lang': 'en',
    'data-test': 'clean',
  }
  bench('propsToString mixed x20', () => {
    for (let n = 0; n < BATCH; n++) propsToString(attrs)
  }, { time: 1500, warmupTime: 500 })
})
