// Standalone perf harness for the compiled server entry, same style as perf-ci.mjs.
// It imports built dist on purpose (measures shipped output), so run `pnpm build` first.
//
// Method: every variant of a group runs in round robin for ROUNDS rounds of BATCH_MS
// each, so slow drift hits all of them alike. The score is the median round in
// operations per second. Before timing, each variant must render bytes identical to v3.
//
//   node bench/compiled-server-perf.mjs
import { pathToFileURL } from 'node:url'
import { createFixtures } from './compiled-server-fixtures.mjs'

const dist = (pkg, name) => import(pathToFileURL(`${process.cwd()}/packages/${pkg}/dist/${name}`).href)
const { useSeoMeta } = await dist('unhead', 'index.mjs')
const { createHead: createV3Head, renderSSRHead: renderV3 } = await dist('unhead', 'server.mjs')
const { compileTags, dynamicValue } = await dist('unhead', 'compiled.mjs')
const { createHead: createCompiledHead, renderSSRHead: renderCompiled } = await dist('unhead', 'compiled/server.mjs')
const { TemplateParamsPlugin } = await dist('unhead', 'plugins.mjs')
const { unpackMeta } = await dist('unhead', 'utils.mjs')

const ROUNDS = Number(process.env.ROUNDS || 15)
const BATCH_MS = Number(process.env.BATCH_MS || 150)
const WARMUP = Number(process.env.WARMUP || 3000)

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[sorted.length >> 1]
}

function round(fn) {
  let sink = 0
  let count = 0
  const start = performance.now()
  let elapsed = 0
  while (elapsed < BATCH_MS) {
    for (let i = 0; i < 64; i++)
      sink += fn().headTags.length
    count += 64
    elapsed = performance.now() - start
  }
  if (!sink)
    throw new Error('rendered nothing')
  return count / (elapsed / 1000)
}

const groups = createFixtures({ compileTags, dynamicValue, unpackMeta, useSeoMeta, createV3Head, renderV3, createCompiledHead, renderCompiled, TemplateParamsPlugin })

const rows = []
for (const group of groups) {
  const variants = Object.entries({ v3: group.v3, compiled: group.compiled }).filter(([, fn]) => fn)
  for (const t of [0, 1, 2]) {
    const expected = JSON.stringify(group.v3(t))
    for (const [name, fn] of variants) {
      if (JSON.stringify(fn(t)) !== expected)
        throw new Error(`${group.name} ${group.tier} ${name} differs from v3:\n${JSON.stringify(fn(t))}\n${expected}`)
    }
  }
  for (const [, fn] of variants) {
    for (let i = 0; i < WARMUP; i++)
      fn()
  }
  const samples = Object.fromEntries(variants.map(([name]) => [name, []]))
  for (let r = 0; r < ROUNDS; r++) {
    for (const [name, fn] of variants)
      samples[name].push(round(fn))
  }
  const v3 = median(samples.v3)
  for (const [name] of variants) {
    const ops = median(samples[name])
    rows.push({ fixture: group.name, tier: group.tier, path: name, 'ops/s': Math.round(ops), 'x v3': Number((ops / v3).toFixed(2)), 'µs/render': Number((1e6 / ops).toFixed(2)) })
  }
}

console.table(rows)
console.log(JSON.stringify({ node: process.version, rounds: ROUNDS, batchMs: BATCH_MS, rows }))
