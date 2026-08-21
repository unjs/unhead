#!/usr/bin/env node
/**
 * Summarize measure.browser.js output: median of 5 runs per page, printed as
 * a markdown table.
 *
 *   node summarize.mjs <unhead-results.json> <sizes.json>
 */
import { readFileSync } from 'node:fs'

const [resultsPath, sizesPath] = process.argv.slice(2)
const runs = JSON.parse(readFileSync(resultsPath, 'utf8'))
const sizes = sizesPath ? JSON.parse(readFileSync(sizesPath, 'utf8')) : {}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const med = (page, key) => median(runs[page].map(r => r[key]))

const pages = Object.keys(runs)
const rows = pages.map((p) => {
  const s = sizes[p] || {}
  return [
    p,
    med(p, 'hydrateMs').toFixed(2),
    med(p, 'navAvgMs').toFixed(4),
    med(p, 'mutationsPerSwitch').toFixed(1),
    med(p, 'hydrateMutations').toFixed(0),
    s.raw ?? '?',
    s.gzip ?? '?',
  ]
})

const header = ['page', 'hydrate ms', 'avg switch ms', 'mutations/switch', 'hydrate mutations', 'js raw B', 'js gzip B']
console.log(`| ${header.join(' | ')} |`)
console.log(`|${header.map(() => '---').join('|')}|`)
for (const r of rows) console.log(`| ${r.join(' | ')} |`)

// consistency checks
for (const p of pages) {
  for (const r of runs[p]) {
    if (r.headChildrenAfter !== r.headChildrenBefore)
      console.error(`note: ${p} head children changed ${r.headChildrenBefore} -> ${r.headChildrenAfter} during hydrate`)
    if (r.finalTitle !== 'About · Harlan Wilton')
      console.error(`WARN: ${p} final title "${r.finalTitle}" (expected route A)`)
    break
  }
}
