import { useHead, useSeoMeta } from '../../packages/unhead/dist/index.mjs'
import { createHead, renderSSRHead } from '../../packages/unhead/dist/server.mjs'

const KiB = 1024
const MiB = KiB * 1024

function formatBytes(bytes) {
  const sign = bytes < 0 ? '-' : ''
  const abs = Math.abs(bytes)
  if (abs < KiB)
    return `${bytes} B`
  if (abs < MiB)
    return `${sign}${Math.round(abs / 102.4) / 10} KiB`
  return `${sign}${Math.round(abs / (MiB / 10)) / 10} MiB`
}

function forceGC() {
  globalThis.gc()
  globalThis.gc()
}

function renderMediumSsrHead() {
  const head = createHead({ disableDefaults: true })
  head.push({
    title: 'Memory benchmark',
    templateParams: {
      separator: '-',
      siteName: 'Unhead',
    },
  })

  for (let i = 0; i < 40; i++) {
    useHead(head, {
      meta: [
        { name: `description-${i}`, content: `Description ${i}` },
        { property: 'og:image', content: `/image-${i}.png` },
      ],
      link: [
        { rel: 'preload', as: 'script', href: `/_nuxt/chunk-${i}.js` },
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            'name': `Page ${i}`,
          },
        },
      ],
    })
  }

  useSeoMeta(head, {
    title: 'Memory benchmark',
    titleTemplate: '%s %separator %siteName',
    description: 'SSR memory benchmark',
    ogTitle: 'Memory benchmark',
    ogDescription: 'SSR memory benchmark',
    ogImage: '/og.png',
    twitterCard: 'summary_large_image',
    twitterImage: '/og.png',
  })

  return renderSSRHead(head, { omitLineBreaks: true })
}

async function measure(name, fn, { warmup = 25, runs = 500, maxHeapDelta = 8 * MiB } = {}) {
  for (let i = 0; i < warmup; i++) fn()
  forceGC()
  const before = process.memoryUsage()
  const start = performance.now()
  for (let i = 0; i < runs; i++) fn()
  forceGC()
  const after = process.memoryUsage()
  const durationMs = performance.now() - start
  const heapDelta = after.heapUsed - before.heapUsed
  const rssDelta = after.rss - before.rss

  console.table([{
    name,
    runs,
    durationMs: Math.round(durationMs * 100) / 100,
    heapUsedBefore: formatBytes(before.heapUsed),
    heapUsedAfter: formatBytes(after.heapUsed),
    heapUsedDelta: formatBytes(heapDelta),
    rssDelta: formatBytes(rssDelta),
  }])

  if (heapDelta > maxHeapDelta) {
    throw new Error(`${name} retained ${formatBytes(heapDelta)} heap, above ${formatBytes(maxHeapDelta)}`)
  }
}

if (typeof globalThis.gc !== 'function') {
  throw new TypeError('Run with node --expose-gc so retained heap can be measured.')
}

await measure('medium ssr render', renderMediumSsrHead)
