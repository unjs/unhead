// Standalone perf harness for CI. Run base and PR on the SAME runner and diff the
// JSON it prints on stdout, so cross-machine variance cancels. Two signals:
//  - SSR render wall-time (mean ms/render, with a 95% relative margin of error)
//  - SSR retained heap over a fixed run (leak indicator, needs --expose-gc)
// It imports built dist on purpose (measures shipped output), hence the .mjs +
// eslint ignore. Output is a single JSON line; keep stdout clean.
import { useHead, useSeoMeta } from '../packages/unhead/dist/index.mjs'
import { createHead, renderSSRHead } from '../packages/unhead/dist/server.mjs'

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

// repeated batches of `runs` renders; each batch's per-render time is one sample,
// so we can derive a mean and a 95% confidence margin of error
function measureTime(fn, { warmup = 50, reps = 25, runs = 200 } = {}) {
  for (let i = 0; i < warmup; i++) fn()
  const samples = []
  for (let r = 0; r < reps; r++) {
    forceGC()
    const t0 = performance.now()
    for (let i = 0; i < runs; i++) fn()
    samples.push((performance.now() - t0) / runs)
  }
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (samples.length - 1)
  const sem = Math.sqrt(variance) / Math.sqrt(samples.length)
  const rme = (sem * 1.96 / mean) * 100 // 95% CI as a percentage of the mean
  return { value: mean, rme }
}

function measureHeap(fn, { warmup = 25, runs = 500 } = {}) {
  for (let i = 0; i < warmup; i++) fn()
  forceGC()
  const before = process.memoryUsage().heapUsed
  for (let i = 0; i < runs; i++) fn()
  forceGC()
  const after = process.memoryUsage().heapUsed
  return { value: after - before, runs }
}

if (typeof globalThis.gc !== 'function')
  throw new TypeError('Run with node --expose-gc so retained heap can be measured.')

const time = measureTime(renderMediumSsrHead)
const heap = measureHeap(renderMediumSsrHead)

const result = {
  benches: [
    { id: 'ssr-medium-time', name: 'SSR render (medium)', kind: 'time', value: time.value, rme: time.rme },
    { id: 'ssr-medium-heap', name: 'SSR heap retained', kind: 'memory', value: heap.value, runs: heap.runs },
  ],
}

console.log(JSON.stringify(result))
