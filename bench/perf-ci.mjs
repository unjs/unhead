// Standalone perf harness for CI. Run base and PR on the SAME runner and diff the
// JSON it prints on stdout, so cross-machine variance cancels. Three signals:
//  - SSR render CPU time (steadier than wall on shared runners; mean ms + 95% RME)
//  - SSR render wall time (mean ms + 95% RME)
//  - SSR allocated bytes per render (near-deterministic, surfaces marginal gains
//    that noisy timing hides; needs --expose-gc)
// It imports built dist on purpose (measures shipped output), hence the .mjs +
// eslint ignore. Output is a single JSON line; keep stdout clean.
import { Session } from 'node:inspector/promises'
import { pathToFileURL } from 'node:url'

// resolve built dist from the repo root (cwd) so this harness can run from anywhere
// (e.g. /tmp during the base-branch measurement) without a relative path back to packages/
const packageDist = (pkg, name) => import(pathToFileURL(`${process.cwd()}/packages/${pkg}/dist/${name}`).href)
const dist = name => packageDist('unhead', name)
const schemaOrgDist = name => packageDist('schema-org', name)
const { useHead, useSeoMeta } = await dist('index.mjs')
const { createHead, renderSSRHead } = await dist('server.mjs')
const {
  defineOrganization,
  defineProduct,
  defineWebPage,
  defineWebSite,
  useSchemaOrg,
} = await schemaOrgDist('index.mjs')

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

function createCachedSchemaOrgRenderer() {
  const head = createHead({ disableDefaults: true })
  head.push({
    htmlAttrs: { lang: 'en-AU' },
    title: 'Widget Pro | Example Store',
    titleTemplate: '%s %separator %siteName',
    templateParams: {
      separator: '|',
      siteName: 'Example Store',
      schemaOrg: {
        host: 'https://example.com',
        url: 'https://example.com/products/widget-pro',
        inLanguage: 'en-AU',
        path: '/products/widget-pro',
      },
    },
    meta: [
      {
        name: 'description',
        content: 'A product page with enough head state to exercise schema.org metadata collection.',
      },
      { property: 'og:image', content: 'https://example.com/products/widget-pro/og.png' },
    ],
    link: [{ rel: 'canonical', href: 'https://example.com/products/widget-pro' }],
  })
  for (let i = 0; i < 32; i++) {
    useHead(head, {
      meta: [
        { name: `product-detail-${i}`, content: `Detail ${i}` },
        { property: `product:attribute:${i}`, content: `Attribute ${i}` },
      ],
      link: [
        { rel: 'preload', as: 'image', href: `/products/widget-pro/gallery-${i}.webp` },
      ],
    })
  }
  useSeoMeta(head, {
    title: 'Widget Pro',
    description: 'A product page with enough head state to exercise schema.org metadata collection.',
    ogTitle: 'Widget Pro',
    ogImage: 'https://example.com/products/widget-pro/og.png',
    twitterCard: 'summary_large_image',
  })
  useSchemaOrg(head, [
    defineWebSite({
      name: 'Example Store',
      inLanguage: 'en-AU',
      description: 'Benchmark storefront',
    }),
    defineWebPage({
      '@type': 'ItemPage',
    }),
    defineOrganization({
      name: 'Example Store',
      url: 'https://example.com',
      logo: 'https://example.com/logo.png',
    }),
    defineProduct({
      name: 'Widget Pro',
      description: 'A benchmark product with a realistic schema.org graph.',
      sku: 'WIDGET-PRO-001',
      brand: { '@type': 'Brand', name: 'WidgetCorp' },
      image: [
        'https://example.com/products/widget-pro/1.jpg',
        'https://example.com/products/widget-pro/2.jpg',
        'https://example.com/products/widget-pro/3.jpg',
      ],
      offers: {
        '@type': 'Offer',
        price: 129.99,
        priceCurrency: 'AUD',
        availability: 'https://schema.org/InStock',
        url: 'https://example.com/products/widget-pro',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: 4.8,
        reviewCount: 256,
      },
    }),
  ])

  renderSSRHead(head, { omitLineBreaks: true })
  return () => renderSSRHead(head, { omitLineBreaks: true })
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

function sampledBytes(profile) {
  let bytes = 0
  const visit = (node) => {
    bytes += node.selfSize || 0
    for (const child of node.children || [])
      visit(child)
  }
  visit(profile.head)
  return bytes
}

// A heapUsed batch delta silently resets whenever V8 scavenges the young
// generation. Profile total allocations instead, across several independent
// samples so the report can gate on the profiler's measured variance.
async function measureAlloc(fn, { warmup = 50, reps = 5, runs = 200 } = {}) {
  for (let i = 0; i < warmup; i++) fn()
  const samples = []
  for (let i = 0; i < reps; i++) {
    forceGC()
    const session = new Session()
    session.connect()
    try {
      await session.post('HeapProfiler.startSampling', {
        samplingInterval: 64,
        includeObjectsCollectedByMajorGC: true,
        includeObjectsCollectedByMinorGC: true,
      })
      for (let j = 0; j < runs; j++) fn()
      const { profile } = await session.post('HeapProfiler.stopSampling')
      samples.push(sampledBytes(profile) / runs)
    }
    finally {
      session.disconnect()
    }
  }
  return stats(samples)
}

// async twins of measureTimes/measureAlloc for the streaming benches, which must be
// awaited per run; kept separate so the sync render benches don't pay the microtask
// overhead of a conditional await inside their hot loop
async function measureTimesAsync(fn, { warmup = 20, reps = 25, runs = 40 } = {}) {
  for (let i = 0; i < warmup; i++) await fn()
  const wall = []
  const cpu = []
  for (let r = 0; r < reps; r++) {
    forceGC()
    const c0 = process.cpuUsage()
    const t0 = performance.now()
    for (let i = 0; i < runs; i++) await fn()
    wall.push((performance.now() - t0) / runs)
    const c = process.cpuUsage(c0)
    cpu.push((c.user + c.system) / 1000 / runs)
  }
  return { wall: stats(wall), cpu: stats(cpu) }
}

async function measureAllocAsync(fn, { warmup = 20, reps = 5, runs = 50 } = {}) {
  for (let i = 0; i < warmup; i++) await fn()
  const samples = []
  for (let i = 0; i < reps; i++) {
    forceGC()
    const session = new Session()
    session.connect()
    try {
      await session.post('HeapProfiler.startSampling', {
        samplingInterval: 64,
        includeObjectsCollectedByMajorGC: true,
        includeObjectsCollectedByMinorGC: true,
      })
      for (let j = 0; j < runs; j++) await fn()
      const { profile } = await session.post('HeapProfiler.stopSampling')
      samples.push(sampledBytes(profile) / runs)
    }
    finally {
      session.disconnect()
    }
  }
  return stats(samples)
}

// Streaming SSR: an end-to-end wrapStream drain (shell + 50 app chunks + closing
// HTML) and the per-suspense-boundary head patch render. Both import the same
// shipped dist as the other benches. Tolerate absence on older base refs.
async function streamingBenches() {
  let streamServer
  try {
    streamServer = await dist('stream/server.mjs')
  }
  catch (e) {
    // skip only when the base ref predates the streaming dist; surface anything else
    if (e?.code === 'MODULE_NOT_FOUND' || e?.code === 'ERR_MODULE_NOT_FOUND')
      return []
    throw e
  }
  const { createStreamableHead, prepareStreamingTemplate, renderSSRHeadSuspenseChunk, wrapStream } = streamServer

  const STREAM_TEMPLATE = '<!DOCTYPE html><html><head><title>Bench</title></head><body><div id="app"><!--app-html--></div></body></html>'
  const STREAM_CHUNK = new TextEncoder().encode('<div class="product"><h2>Wireless Headphones</h2><p>Premium sound quality with noise cancellation.</p><span class="price">$79.99</span></div>')

  const makeAppStream = (chunks) => {
    let i = 0
    return new ReadableStream({
      pull(controller) {
        if (i++ < chunks)
          controller.enqueue(STREAM_CHUNK)
        else
          controller.close()
      },
    })
  }

  const drainWrappedStream = async () => {
    const { head } = createStreamableHead()
    head.push({
      title: 'Streaming bench',
      meta: [{ name: 'description', content: 'streaming perf' }],
    })
    const reader = wrapStream(head, makeAppStream(50), STREAM_TEMPLATE).getReader()
    while (!(await reader.read()).done)
      ;
  }

  // per-boundary head patch: 5 entries pushed then flushed, like a suspense chunk
  const { head: chunkHead } = createStreamableHead()
  chunkHead.push({ title: 'Shell' })
  prepareStreamingTemplate(chunkHead, STREAM_TEMPLATE)
  let boundary = 0
  const renderSuspenseChunk = () => {
    for (let j = 0; j < 5; j++) {
      chunkHead.push({
        title: `Chunk ${boundary}-${j}`,
        meta: [{ name: 'description', content: `chunk ${boundary}-${j}` }],
      })
    }
    boundary++
    renderSSRHeadSuspenseChunk(chunkHead)
  }

  const wrapTimes = await measureTimesAsync(drainWrappedStream, { warmup: 50, reps: 30, runs: 100 })
  const wrapAlloc = await measureAllocAsync(drainWrappedStream)
  const chunkTimes = measureTimes(renderSuspenseChunk, { reps: 30, runs: 120 })
  const chunkAlloc = await measureAlloc(renderSuspenseChunk)

  return [
    { id: 'stream-wrap-cpu', name: 'Streaming wrapStream drain (CPU)', kind: 'time', value: wrapTimes.cpu.value, rme: wrapTimes.cpu.rme },
    { id: 'stream-wrap-wall', name: 'Streaming wrapStream drain (wall)', kind: 'time', value: wrapTimes.wall.value, rme: wrapTimes.wall.rme, informational: true },
    { id: 'stream-wrap-alloc', name: 'Streaming allocated / drain', kind: 'alloc', value: wrapAlloc.value, rme: wrapAlloc.rme },
    { id: 'stream-chunk-cpu', name: 'Streaming suspense chunk (CPU)', kind: 'time', value: chunkTimes.cpu.value, rme: chunkTimes.cpu.rme },
    { id: 'stream-chunk-alloc', name: 'Streaming allocated / suspense chunk', kind: 'alloc', value: chunkAlloc.value, rme: chunkAlloc.rme },
  ]
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
  catch (e) {
    // skip CSR only when jsdom genuinely isn't installed; surface any other failure
    if (e?.code === 'MODULE_NOT_FOUND' || e?.code === 'ERR_MODULE_NOT_FOUND')
      return []
    throw e
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
      // childList counts each node touched; attribute and characterData (title/text) are one op each
      muts += r.type === 'childList' ? r.addedNodes.length + r.removedNodes.length : 1
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
    { id: 'csr-nav-wall', name: 'CSR re-render (wall)', kind: 'time', value: t.wall.value, rme: t.wall.rme, informational: true },
  ]
}

const times = measureTimes(renderMediumSsrHead)
const alloc = await measureAlloc(renderMediumSsrHead)
const renderCachedSchemaOrgHead = createCachedSchemaOrgRenderer()
const schemaOrgTimes = measureTimes(renderCachedSchemaOrgHead, { reps: 30, runs: 120 })
const schemaOrgAlloc = await measureAlloc(renderCachedSchemaOrgHead)

const result = {
  benches: [
    { id: 'ssr-medium-cpu', name: 'SSR render (CPU)', kind: 'time', value: times.cpu.value, rme: times.cpu.rme },
    { id: 'ssr-medium-wall', name: 'SSR render (wall)', kind: 'time', value: times.wall.value, rme: times.wall.rme, informational: true },
    { id: 'ssr-medium-alloc', name: 'SSR allocated / render', kind: 'alloc', value: alloc.value, rme: alloc.rme },
    { id: 'schema-org-cached-cpu', name: 'Schema.org cached render (CPU)', kind: 'time', value: schemaOrgTimes.cpu.value, rme: schemaOrgTimes.cpu.rme },
    { id: 'schema-org-cached-wall', name: 'Schema.org cached render (wall)', kind: 'time', value: schemaOrgTimes.wall.value, rme: schemaOrgTimes.wall.rme, informational: true },
    { id: 'schema-org-cached-alloc', name: 'Schema.org cached allocated / render', kind: 'alloc', value: schemaOrgAlloc.value, rme: schemaOrgAlloc.rme },
    ...await streamingBenches(),
    ...await csrBenches(),
  ],
}

console.log(JSON.stringify(result))
