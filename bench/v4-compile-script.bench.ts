import { bench, describe } from 'vitest'
import { compileEntry } from '../packages/unhead/src/v4/compile'

const payload = `{"data":"${'x'.repeat(1_100_000)}"}`
const common = {
  link: Array.from({ length: 10 }, (_, i) => ({ rel: 'stylesheet', href: `/entry-${i}.css`, crossorigin: '' })),
  meta: Array.from({ length: 30 }, (_, i) => ({ property: `og:item:${i}`, content: i % 2 ? `value-${i}` : i })),
  script: [{ src: '/entry.js', type: 'module', crossorigin: '' }],
}

describe('v4 large payload script compilation', () => {
  bench('compileEntry, application/json without less-than', () => {
    compileEntry({ script: [{ type: 'application/json', textContent: payload }] }, 1, null)
  }, { time: 1500, warmupTime: 500 })

  bench('compileEntry, common meta, link, and script props', () => {
    compileEntry(common, 1, null)
  }, { time: 1500, warmupTime: 500 })
})
