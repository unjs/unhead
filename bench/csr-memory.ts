import type { createHead as CreateHead } from 'unhead/client'
import type { createHead as CreateServerHead, renderSSRHead as RenderSsrHead } from 'unhead/server'
import type { ResolvableHead } from 'unhead/types'
import type { PerfRun } from './bundle/perf-report'
import { createRequire } from 'node:module'
import process from 'node:process'
import { setImmediate } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { sampleMemory, summarizeMemory } from './memory.ts'

function pageHead(page: number, ready = false): ResolvableHead {
  return {
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
  }
}

export function renderProductPage(createHead: typeof CreateServerHead, renderSSRHead: typeof RenderSsrHead, page: number) {
  const head = createHead({ disableDefaults: true })
  head.push(pageHead(page, true))
  return renderSSRHead(head, { omitLineBreaks: true })
}

export type NavigationProfile = 'managed' | 'router-hints' | 'large-app'

// One persistent SPA head, optionally including externally managed router hints.
export function createNavigationSession(createHead: typeof CreateHead, document: Document, profile: NavigationProfile = 'router-hints') {
  const head = createHead({ document })
  const hintsPerNavigation = profile === 'managed' ? 0 : profile === 'large-app' ? 24 : 8
  if (profile === 'large-app') {
    // Shared application chunks and styles stay mounted while route chunks change.
    head.push({
      link: [
        ...Array.from({ length: 48 }, (_, chunk) => ({ rel: 'modulepreload' as const, href: `/_nuxt/shared-${chunk}.js` })),
        ...Array.from({ length: 16 }, (_, chunk) => ({ rel: 'stylesheet' as const, href: `/_nuxt/shared-${chunk}.css` })),
      ],
    })
  }
  const entry = head.push(pageHead(0))
  let page = 0

  function navigateSync(count: number) {
    for (let i = 0; i < count; i++) {
      page++
      // A router inserts hints before the page renders, then removes them after loading.
      const hints = Array.from({ length: hintsPerNavigation }, (_, chunk) => {
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
  }

  return {
    navigateSync,
    async navigate(count: number) {
      navigateSync(count)
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

async function measureCsrMemory(scenario: 'csr' | 'router-hints' | 'large-app'): Promise<PerfRun> {
  // CI copies this script to /tmp. Resolve dependencies and shipped code from cwd.
  const require = createRequire(`${process.cwd()}/package.json`)
  const { JSDOM } = require('jsdom') as typeof import('jsdom')
  const { createHead } = await import(pathToFileURL(`${process.cwd()}/packages/unhead/dist/client.mjs`).href) as typeof import('unhead/client')
  const samples = []
  const detached: number[] = []
  const navigations = scenario === 'large-app' ? 1000 : 200
  const label = scenario === 'large-app' ? 'CSR large app, 24 hints' : scenario === 'router-hints' ? 'CSR router hints' : 'CSR managed'
  const id = scenario === 'large-app' ? 'csr-large' : scenario === 'router-hints' ? 'csr-nav' : 'csr-managed'

  for (let rep = 0; rep < 5; rep++) {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
    try {
      const session = createNavigationSession(createHead, dom.window.document, scenario === 'csr' ? 'managed' : scenario)
      await session.navigate(30)
      const beforeDetached = session.detachedElements()
      samples.push(await sampleMemory(() => session.navigate(navigations), {
        gc: globalThis.gc!,
        settle: setImmediate,
        readMemory: process.memoryUsage,
      }))
      // Keep the head and document alive until after the memory readings.
      detached.push(session.detachedElements() - beforeDetached)
    }
    finally {
      dom.window.close()
    }
    await setImmediate()
  }

  return {
    benches: [
      ...summarizeMemory(id, label, navigations, samples, 'navs (jsdom)'),
      ...(scenario !== 'csr' ? [{ id: `${id}-detached-elements`, name: `${label} detached cached elements / ${navigations} navs`, kind: 'count' as const, category: 'memory' as const, ...stats(detached) }] : []),
    ],
  }
}

async function measureSsrMemory(): Promise<PerfRun> {
  const { createHead, renderSSRHead } = await import(pathToFileURL(`${process.cwd()}/packages/unhead/dist/server.mjs`).href) as typeof import('unhead/server')
  let page = 0
  const render = (count: number) => {
    for (let i = 0; i < count; i++)
      renderProductPage(createHead, renderSSRHead, page++)
  }
  const samples = []
  for (let rep = 0; rep < 5; rep++) {
    render(30)
    samples.push(await sampleMemory(() => render(200), {
      gc: globalThis.gc!,
      settle: setImmediate,
      readMemory: process.memoryUsage,
    }))
  }
  return { benches: summarizeMemory('ssr-requests', 'SSR product pages', 200, samples, 'renders') }
}

if (import.meta.main) {
  if (typeof globalThis.gc !== 'function')
    throw new TypeError('Run with node --expose-gc to measure retained heap.')
  const scenario = process.argv[2] ?? 'router-hints'
  if (scenario !== 'ssr' && scenario !== 'csr' && scenario !== 'router-hints' && scenario !== 'large-app')
    throw new TypeError('Choose ssr, csr, router-hints or large-app for the memory workload.')
  // eslint-disable-next-line antfu/no-top-level-await -- standalone Node benchmark entry point
  const result = await (scenario === 'ssr' ? measureSsrMemory() : measureCsrMemory(scenario))
  // eslint-disable-next-line no-console -- stdout is the CI report protocol
  console.log(JSON.stringify(result))
}
