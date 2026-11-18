/* eslint-disable no-console, antfu/no-top-level-await -- a standalone harness, like the ignored .mjs ones in bench */
// Standalone perf harness for the compiled runtime of the lazy head, in the style of
// compiled-server-perf.mjs. It imports built dist on purpose, so run `pnpm build` first.
//
// Timers run from a synchronous queue, so a debounced render costs its work and not
// the event loop. Every variant of a group runs in round robin for ROUNDS rounds of
// BATCH_MS each, and the score is the median round. Before timing, the compiled runtime
// must leave the document byte identical to v3.
//
//   node bench/compiled-client-perf.ts
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

const dist = (pkg: string, name: string) => import(pathToFileURL(`${process.cwd()}/packages/${pkg}/dist/${name}`).href)
const { createHead: createV3Head } = await dist('unhead', 'client.mjs')
const { createLazyHead } = await dist('unhead', 'lazy.mjs')
const { compileTags } = await dist('unhead', 'compiled.mjs')
const { createHead: createServerHead, renderSSRHead } = await dist('unhead', 'server.mjs')

const ROUNDS = Number(process.env.ROUNDS || 15)
const BATCH_MS = Number(process.env.BATCH_MS || 150)
const WARMUP = Number(process.env.WARMUP || 300)

const timers = new Map<number, () => void>()
let nextId = 0
globalThis.setTimeout = ((fn: () => void) => {
  timers.set(++nextId, fn)
  return nextId
}) as any
globalThis.clearTimeout = ((id: number) => timers.delete(id)) as any
function flush() {
  for (const [id, fn] of timers) {
    timers.delete(id)
    fn()
  }
}

// a page of a typical Nuxt app: app head, page head, and component heads
const app = { htmlAttrs: { lang: 'en' }, meta: [{ charset: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }], titleTemplate: '%s | Site', link: [{ rel: 'icon', href: '/favicon.ico' }] }
function page(n: number) {
  return {
    title: `Page ${n}`,
    bodyAttrs: { class: `page page-${n}` },
    meta: [
      { name: 'description', content: `About page ${n}` },
      { property: 'og:title', content: `Page ${n}` },
      { property: 'og:description', content: `About page ${n}` },
      { property: 'og:image', content: `/og/${n}-1.png` },
      { property: 'og:image', content: `/og/${n}-2.png` },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [{ rel: 'canonical', href: `https://example.com/${n}` }, { rel: 'alternate', hreflang: 'fr', href: `https://example.com/fr/${n}` }],
    script: [{ src: '/app.js', defer: true }, { key: 'ld', type: 'application/ld+json', innerHTML: { '@type': 'WebPage', 'name': `Page ${n}` } }],
  }
}
const components = Array.from({ length: 10 }, (_, i) => ({ meta: [{ name: `component-${i}`, content: `value ${i}` }], link: [{ rel: 'prefetch', href: `/chunk-${i}.js` }] }))
const inputs = [app, page(1), ...components]

function compiledTags(input: unknown) {
  const result = compileTags(input)
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}
const compiledTagSets = inputs.map(compiledTags)
const pageTagSets = [compiledTags(page(1)), compiledTags(page(2))]

function ssrDocument() {
  const server = createServerHead({ disableDefaults: true })
  inputs.forEach(input => server.push(input))
  const { headTags, htmlAttrs, bodyAttrs } = renderSSRHead(server)
  return new JSDOM(`<!DOCTYPE html><html${htmlAttrs}><head>${headTags}</head><body${bodyAttrs}><div>app</div></body></html>`)
}

// First render: a fresh head over the server document, as at the end of hydration
const firstRender = {
  v3(document: Document) {
    const head = createV3Head({ document })
    head._b = true
    inputs.forEach(input => head.push(input))
    head.render()
  },
  async compiled(document: Document) {
    const head = createLazyHead({ document })
    compiledTagSets.forEach(p => head.push(p))
    head.render()
    await head.load()
    flush()
  },
}

// Re-render: one loaded head, and one entry patched between two pages each time
async function rerenderPair(document: Document) {
  const v3 = createV3Head({ document })
  v3._b = true
  const v3Entries = inputs.map(input => v3.push(input))
  v3.render()
  v3._b = false
  const head = createLazyHead({ document })
  const compiledEntries = compiledTagSets.map(p => head.push(p))
  head.render()
  await head.load()
  flush()
  let n = 0
  return {
    v3() {
      v3Entries[1].patch(page(++n % 2 + 1))
    },
    compiled() {
      compiledEntries[1].patch(pageTagSets[++n % 2])
      flush()
    },
  }
}

function median(values: number[]) {
  return [...values].sort((a, b) => a - b)[values.length >> 1]!
}

async function round(fn: () => unknown) {
  let count = 0
  const start = performance.now()
  let elapsed = 0
  while (elapsed < BATCH_MS) {
    for (let i = 0; i < 16; i++)
      await fn()
    count += 16
    elapsed = performance.now() - start
  }
  return count / (elapsed / 1000)
}

// both heads leave the same document behind, and the compiled head never loads v3, before timing anything
{
  const probe = createLazyHead({ document: ssrDocument().window.document })
  compiledTagSets.forEach(p => probe.push(p))
  probe.render()
  await probe.load()
  flush()
  if (probe.resolvedOptions._tagWeight)
    throw new Error('the compiled head loaded the full runtime')
  const a = ssrDocument()
  const b = ssrDocument()
  firstRender.v3(a.window.document)
  await firstRender.compiled(b.window.document)
  if (a.serialize() !== b.serialize())
    throw new Error('first render differs from v3')
  const c = ssrDocument()
  const d = ssrDocument()
  const v3 = await rerenderPair(c.window.document)
  const p = await rerenderPair(d.window.document)
  v3.v3()
  p.tags()
  if (c.serialize() !== d.serialize())
    throw new Error('re-render differs from v3')
}

const groups: [string, Record<string, () => unknown>][] = []
const first = ssrDocument().window.document
groups.push(['first render and adoption', { v3: () => firstRender.v3(first), compiled: () => firstRender.compiled(first) }])
const rerender = await rerenderPair(ssrDocument().window.document)
groups.push(['re-render after a page patch', { v3: rerender.v3, compiled: rerender.compiled }])

const rows = []
for (const [name, variants] of groups) {
  for (const fn of Object.values(variants)) {
    for (let i = 0; i < WARMUP; i++)
      await fn()
  }
  const samples: Record<string, number[]> = { v3: [], compiled: [] }
  for (let r = 0; r < ROUNDS; r++) {
    for (const [variant, fn] of Object.entries(variants))
      samples[variant]!.push(await round(fn))
  }
  const v3 = median(samples.v3!)
  for (const variant of Object.keys(variants)) {
    const ops = median(samples[variant]!)
    rows.push({ 'case': name, 'path': variant, 'ops/s': Math.round(ops), 'x v3': Number((ops / v3).toFixed(2)), 'µs/op': Number((1e6 / ops).toFixed(1)) })
  }
}

console.table(rows)
console.log(JSON.stringify({ node: process.version, rounds: ROUNDS, batchMs: BATCH_MS, loadavg: (await import('node:os')).loadavg(), rows }))
