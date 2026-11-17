import type { createHead as CreateHead } from 'unhead/client'
import type { ResolvableHead } from 'unhead/types'
import type { PerfRun } from './bundle/perf-report'
import { createRequire } from 'node:module'
import process from 'node:process'
import { setImmediate } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

// One persistent SPA head, with route metadata and externally managed router hints.
export function createNavigationSession(createHead: typeof CreateHead, document: Document) {
  const head = createHead({ document })
  const pageHead = (page: number, ready = false): ResolvableHead => ({
    title: `Product ${page} | Example Store`,
    meta: [
      { name: 'description', content: `Details and reviews for product ${page}.` },
      { property: 'og:title', content: `Product ${page}` },
      { property: 'og:image', content: `/products/${page}/og.webp` },
    ],
    link: [
      { rel: 'canonical', href: `https://example.com/products/${page}` },
      { rel: 'modulepreload', href: `/_nuxt/page-${page}.js` },
      ...(ready ? [{ rel: 'preload' as const, as: 'image' as const, href: `/products/${page}/hero.webp` }] : []),
    ],
  })
  const entry = head.push(pageHead(0))
  let page = 0

  return {
    async navigate(count: number) {
      for (let i = 0; i < count; i++) {
        page++
        // A router inserts hints before the page renders, then removes them after loading.
        const hints = Array.from({ length: 8 }, (_, chunk) => {
          const link = document.createElement('link')
          link.rel = 'prefetch'
          link.href = `/_nuxt/product-${page}-${chunk}.js`
          document.head.appendChild(link)
          return link
        })
        entry.patch(pageHead(page))
        for (const hint of hints)
          hint.remove()
        // Async page content adds a new image preload, causing another head scan.
        entry.patch(pageHead(page, true))
      }
      // Let jsdom release mutation records before measuring retained memory.
      await setImmediate()
    },
    detachedElements: () => [...head._dom!._e.values()].filter(el => !el.isConnected).length,
  }
}

function stats(samples: number[]) {
  const value = samples.reduce((sum, sample) => sum + sample, 0) / samples.length
  const variance = samples.reduce((sum, sample) => sum + (sample - value) ** 2, 0) / (samples.length - 1)
  const error = 1.96 * Math.sqrt(variance / samples.length)
  return { value, rme: value === 0 ? 0 : error / Math.abs(value) * 100 }
}

async function measureCsrMemory(): Promise<PerfRun> {
  if (typeof globalThis.gc !== 'function')
    throw new TypeError('Run with node --expose-gc to measure retained heap.')

  // CI copies this script to /tmp. Resolve dependencies and shipped code from cwd.
  const require = createRequire(`${process.cwd()}/package.json`)
  const { JSDOM } = require('jsdom') as typeof import('jsdom')
  const { createHead } = await import(pathToFileURL(`${process.cwd()}/packages/unhead/dist/client.mjs`).href) as typeof import('unhead/client')
  const heap: number[] = []
  const detached: number[] = []
  const navigations = 200

  for (let rep = 0; rep < 5; rep++) {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
    try {
      const session = createNavigationSession(createHead, dom.window.document)
      await session.navigate(30)
      globalThis.gc()
      globalThis.gc()
      const beforeHeap = process.memoryUsage().heapUsed
      const beforeDetached = session.detachedElements()
      await session.navigate(navigations)
      globalThis.gc()
      globalThis.gc()
      // Keep the head and document alive until after both readings.
      heap.push(process.memoryUsage().heapUsed - beforeHeap)
      detached.push(session.detachedElements() - beforeDetached)
    }
    finally {
      dom.window.close()
    }
    await setImmediate()
  }

  return {
    benches: [
      // jsdom heap includes its own bookkeeping. Use the exact count for the verdict.
      { id: 'csr-nav-retained-heap', name: 'CSR retained heap / 200 navs (jsdom)', kind: 'memory', ...stats(heap), informational: true },
      { id: 'csr-nav-detached-elements', name: 'CSR detached cached elements / 200 navs', kind: 'count', ...stats(detached) },
    ],
  }
}

if (import.meta.main) {
  // eslint-disable-next-line antfu/no-top-level-await -- standalone Node benchmark entry point
  const result = await measureCsrMemory()
  // eslint-disable-next-line no-console -- stdout is the CI report protocol
  console.log(JSON.stringify(result))
}
