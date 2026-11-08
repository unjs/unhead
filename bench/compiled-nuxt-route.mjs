// The SSR acceptance bench: unhead's share of one Nuxt request, per route size and renderer
// shape. It imports built dist on purpose, so run the build first.
//
// Timed: `createHead`, every push, and the render. The renderer variants also build their inputs
// and keys per request, as Nuxt does. Excluded, because it is Nuxt's own work on either side: Vue
// rendering, `getRequestDependencies` and the link builders, `stringify` of the payload, `uneval`
// of the config, `renderHTMLDocument`, and the response write. So a ratio here is a ratio of head
// work, not of whole requests.
//
// Both renderers return the payload inside a lazily joined string, and `renderHTMLDocument`
// copies it once either way. FLATTEN=1 times that copy too, so no variant can hide work in it.
//
// Method: every variant of a route runs in round robin for ROUNDS rounds of BATCH_MS each, so
// slow drift hits all of them alike. The score is the median round. Before timing, each variant
// must render bytes identical to its v3 twin. Load is printed next to every run.
//
//   node bench/compiled-nuxt-route.mjs
import { loadavg } from 'node:os'
import { pathToFileURL } from 'node:url'
import { BASELINES, createNuxtRoutes } from './compiled-nuxt-route-fixtures.mjs'

const dist = (pkg, name) => import(pathToFileURL(`${process.cwd()}/packages/${pkg}/dist/${name}`).href)
const { useHead, useSeoMeta } = await dist('vue', 'index.mjs')
const { createHead: createV3Head, renderSSRHead: renderV3 } = await dist('vue', 'server.mjs')
const { createHead: createCompiledHead, prepareHeadInput, renderSSRHead: renderCompiled } = await dist('vue', 'compiled/server.mjs')
const { compileTags, dynamicValue } = await dist('unhead', 'compiled.mjs')
const { TemplateParamsPlugin } = await dist('unhead', 'plugins.mjs')
const { legacyPlugins } = await dist('unhead', 'legacy.mjs')
const { unpackMeta } = await dist('unhead', 'utils.mjs')

const ROUNDS = Number(process.env.ROUNDS || 15)
const BATCH_MS = Number(process.env.BATCH_MS || 150)
const WARMUP = Number(process.env.WARMUP || 3000)
const ONLY = process.env.ONLY?.split(',')
const ROUTES = process.env.ROUTES?.split(',')

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[sorted.length >> 1]
}

const FLATTEN = process.env.FLATTEN === '1'

// `charCodeAt` flattens a joined string, so with FLATTEN=1 the copy lands in the timed region
function consume(html) {
  return FLATTEN
    ? html.headTags.charCodeAt(0) + html.bodyTags.charCodeAt(0) + html.headTags.length
    : html.headTags.length + html.bodyTags.length
}

function round(fn) {
  let sink = 0
  let count = 0
  const start = performance.now()
  let elapsed = 0
  while (elapsed < BATCH_MS) {
    for (let i = 0; i < 16; i++)
      sink += consume(fn())
    count += 16
    elapsed = performance.now() - start
  }
  if (!sink)
    throw new Error('rendered nothing')
  return count / (elapsed / 1000)
}

const load = () => loadavg().map(value => value.toFixed(2)).join(' ')

const routes = createNuxtRoutes({ compileTags, dynamicValue, prepareHeadInput, unpackMeta, useHead, useSeoMeta, createV3Head, renderV3, createCompiledHead, renderCompiled, TemplateParamsPlugin, legacyPlugins })
const rows = []
const startLoad = load()
for (const route of routes) {
  if (ROUTES && !ROUTES.includes(route.name))
    continue
  const reference = route.variants['A v3']
  for (const [name, fn] of Object.entries(route.variants)) {
    const expected = route.expected[name] || reference
    for (const t of [0, 1, 2]) {
      const want = JSON.stringify(expected(t))
      const got = JSON.stringify(fn(t))
      if (got !== want)
        throw new Error(`${route.name} ${name} differs from v3 at variant ${t}:\n${got.slice(0, 2000)}\n${want.slice(0, 2000)}`)
    }
  }
  const variants = Object.entries(route.variants).filter(([name]) => !ONLY || name === 'A v3' || ONLY.some(prefix => name.startsWith(prefix)))
  for (const [, fn] of variants) {
    for (let i = 0; i < WARMUP; i++)
      consume(fn())
  }
  const samples = Object.fromEntries(variants.map(([name]) => [name, []]))
  for (let r = 0; r < ROUNDS; r++) {
    for (const [name, fn] of variants)
      samples[name].push(round(fn))
  }
  const micros = Object.fromEntries(variants.map(([name]) => [name, 1e6 / median(samples[name])]))
  for (const [name] of variants) {
    const base = BASELINES[name]
    rows.push({
      route: route.name,
      variant: name,
      'µs/request': Number(micros[name].toFixed(2)),
      'x baseline': micros[base] ? Number((micros[base] / micros[name]).toFixed(2)) : null,
      'baseline': base || '-',
      load: load(),
    })
  }
}

console.table(rows)
console.log(JSON.stringify({ node: process.version, flatten: FLATTEN, rounds: ROUNDS, batchMs: BATCH_MS, startLoad, endLoad: load(), rows }))
