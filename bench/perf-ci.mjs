// Standalone perf harness for CI. Run base and PR on the SAME runner and diff the
// JSON it prints on stdout, so cross-machine variance cancels. Three signals:
//  - SSR render CPU time (steadier than wall on shared runners; mean ms + 95% RME)
//  - SSR render wall time (mean ms + 95% RME)
//  - SSR allocated bytes per render (near-deterministic, surfaces marginal gains
//    that noisy timing hides; needs --expose-gc)
// It imports built dist on purpose (measures shipped output), hence the .mjs +
// eslint ignore. Output is a single JSON line; keep stdout clean.
import { pathToFileURL } from 'node:url'

// resolve built dist from the repo root (cwd) so this harness can run from anywhere
// (e.g. /tmp during the base-branch measurement) without a relative path back to packages/
const dist = name => import(pathToFileURL(`${process.cwd()}/packages/unhead/dist/${name}`).href)
const { useHead, useSeoMeta } = await dist('index.mjs')
const { createHead, renderSSRHead } = await dist('server.mjs')

function renderMediumSsrHead() {
  const head = createHead({ disableDefaults: true })
  head.push({
    title: 'Perf benchmark',
    templateParams: { separator: '-', siteName: 'Unhead' },
  })
  for (let i = 0; i < 40; i++) {
    useHead(head, {
      meta: [
        { name: `description-${i}`, content: `Description ${i}` },
        { property: 'og:image', content: `/image-${i}.png` },
      ],
      link: [{ rel: 'preload', as: 'script', href: `/_nuxt/chunk-${i}.js` }],
      script: [{ type: 'application/ld+json', innerHTML: { '@context': 'https://schema.org', '@type': 'WebPage', 'name': `Page ${i}` } }],
    })
  }
  useSeoMeta(head, {
    title: 'Perf benchmark',
    titleTemplate: '%s %separator %siteName',
    description: 'SSR perf benchmark',
    ogTitle: 'Perf benchmark',
    ogImage: '/og.png',
    twitterCard: 'summary_large_image',
  })
  return renderSSRHead(head, { omitLineBreaks: true })
}

function forceGC() {
  globalThis.gc()
  globalThis.gc()
}

function stats(samples) {
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (samples.length - 1)
  const sem = Math.sqrt(variance) / Math.sqrt(samples.length)
  return { value: mean, rme: (sem * 1.96 / mean) * 100 } // 95% CI as a percentage of the mean
}

// per batch, record both wall time and CPU time (user+system). On shared CI runners
// CPU time is steadier than wall-clock because it excludes time the process was
// descheduled, so it's the more trustworthy of the two timing signals.
function measureTimes(fn, { warmup = 50, reps = 40, runs = 250 } = {}) {
  for (let i = 0; i < warmup; i++) fn()
  const wall = []
  const cpu = []
  for (let r = 0; r < reps; r++) {
    forceGC()
    const c0 = process.cpuUsage()
    const t0 = performance.now()
    for (let i = 0; i < runs; i++) fn()
    wall.push((performance.now() - t0) / runs)
    const c = process.cpuUsage(c0)
    cpu.push((c.user + c.system) / 1000 / runs) // microseconds -> ms per render
  }
  return { wall: stats(wall), cpu: stats(cpu) }
}

// bytes allocated per render. The batch (`runs`) stays under new-space so no scavenge
// fires mid-batch, making heapUsed delta == bytes allocated. Allocation is near
// deterministic, so the median across reps has tiny variance — marginal wins (which
// noisy wall-time hides) show up here.
function measureAlloc(fn, { warmup = 50, reps = 25, runs = 60 } = {}) {
  for (let i = 0; i < warmup; i++) fn()
  const samples = []
  for (let r = 0; r < reps; r++) {
    forceGC()
    const before = process.memoryUsage().heapUsed
    for (let i = 0; i < runs; i++) fn()
    samples.push((process.memoryUsage().heapUsed - before) / runs)
  }
  samples.sort((a, b) => a - b)
  return { value: samples[samples.length >> 1] }
}

if (typeof globalThis.gc !== 'function')
  throw new TypeError('Run with node --expose-gc so allocation can be measured.')

// CSR: client re-render (SPA navigation) against a jsdom document. The faithful,
// browser-agnostic signal is DOM mutation count (a good diff touches only what
// changed); jsdom heap alloc is NOT measured here because it's dominated by jsdom
// internals, not the renderer. Time is directional. Skipped if jsdom is absent.
async function csrBenches() {
  let JSDOM
  try {
    // resolve jsdom from cwd (repo root), not this script's dir — base perf runs it from /tmp
    const { createRequire } = await import('node:module')
    const req = createRequire(`${process.cwd()}/`)
    ;({ JSDOM } = await import(pathToFileURL(req.resolve('jsdom')).href))
  }
  catch {
    return []
  }
  const { createHead } = await dist('client.mjs')

  const pageHead = i => ({
    title: `Page ${i}`,
    titleTemplate: '%s | Site',
    htmlAttrs: { class: `theme-${i % 3} loaded` },
    meta: Array.from({ length: 20 }, (_, j) => ({ name: `m${j}`, content: `v${i}-${j}` })),
    link: Array.from({ length: 6 }, (_, j) => ({ rel: 'preload', as: 'script', href: `/_nuxt/c${i}-${j}.js` })),
    script: [{ src: `/app-${i}.js`, defer: true }],
  })

  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
  const W = dom.window
  const head = createHead({ document: W.document })
  const entry = head.push(pageHead(0))
  let i = 1
  const nav = () => entry.patch(pageHead(i++))

  // DOM mutations per navigation (deterministic): observe a fixed window of navs
  for (let w = 0; w < 20; w++) nav()
  let muts = 0
  const obs = new W.MutationObserver((records) => {
    for (const r of records)
      muts += r.type === 'attributes' ? 1 : r.addedNodes.length + r.removedNodes.length
  })
  obs.observe(W.document.documentElement, { attributes: true, childList: true, subtree: true, characterData: true })
  const N = 200
  for (let k = 0; k < N; k++) nav()
  await new Promise(r => setTimeout(r, 0)) // flush the observer's microtask queue
  obs.disconnect()

  const t = measureTimes(nav, { warmup: 50, reps: 30, runs: 60 })
  return [
    { id: 'csr-nav-mutations', name: 'CSR DOM mutations / nav', kind: 'count', value: muts / N },
    { id: 'csr-nav-cpu', name: 'CSR re-render (CPU)', kind: 'time', value: t.cpu.value, rme: t.cpu.rme },
    { id: 'csr-nav-wall', name: 'CSR re-render (wall)', kind: 'time', value: t.wall.value, rme: t.wall.rme },
  ]
}

const times = measureTimes(renderMediumSsrHead)
const alloc = measureAlloc(renderMediumSsrHead)

const result = {
  benches: [
    { id: 'ssr-medium-cpu', name: 'SSR render (CPU)', kind: 'time', value: times.cpu.value, rme: times.cpu.rme },
    { id: 'ssr-medium-wall', name: 'SSR render (wall)', kind: 'time', value: times.wall.value, rme: times.wall.rme },
    { id: 'ssr-medium-alloc', name: 'SSR allocated / render', kind: 'alloc', value: alloc.value },
    ...await csrBenches(),
  ],
}

console.log(JSON.stringify(result))
