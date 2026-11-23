import type { createHead as CreateHead } from 'unhead/client'
import type { PerfBench, PerfRun } from './bundle/perf-report'
import { createRequire } from 'node:module'
import process from 'node:process'
import { setImmediate } from 'node:timers/promises'
import { createNavigationSession } from './csr-memory.ts'

export interface DomReads {
  connectivity: number
  scans: number
}

// Instrument a separate run so getter wrappers do not affect timing samples.
export function observeDomReads(document: Document, render: () => void): DomReads {
  const window = document.defaultView!
  const node = window.Node.prototype
  const element = window.Element.prototype
  const connected = Object.getOwnPropertyDescriptor(node, 'isConnected')!
  const children = Object.getOwnPropertyDescriptor(element, 'children')!
  const reads = { connectivity: 0, scans: 0 }
  try {
    Object.defineProperty(node, 'isConnected', {
      ...connected,
      get(this: Node) {
        reads.connectivity++
        return connected.get!.call(this)
      },
    })
    Object.defineProperty(element, 'children', {
      ...children,
      get(this: Element) {
        // Each renderer scan reads head.children and body.children. Count the head once.
        if (this === document.head)
          reads.scans++
        return children.get!.call(this)
      },
    })
    render()
    return reads
  }
  finally {
    Object.defineProperty(node, 'isConnected', connected)
    Object.defineProperty(element, 'children', children)
  }
}

const scenarios = {
  'idle': { name: 'CSR unchanged render', unit: '1000 calls' },
  'cached': { name: 'CSR cached update', unit: 'render' },
  'missing': { name: 'CSR cache miss, 128 managed tags', unit: 'render' },
  'router-fresh': { name: 'CSR router hints, after 30 navs', unit: 'nav' },
  'router-long': { name: 'CSR router hints, after 500 navs', unit: 'nav' },
  'large-fresh': { name: 'CSR large app, 24 hints, after 30 navs', unit: 'nav' },
  'large-long': { name: 'CSR large app, 24 hints, after 1000 navs', unit: 'nav' },
} as const

export type CsrScenario = keyof typeof scenarios

const hydrationMeta = [
  { charset: 'utf-8' },
  { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  { name: 'description', content: 'Documentation and examples for a Nuxt site' },
  ...Array.from({ length: 13 }, (_, index) => ({ property: `og:detail-${index}`, content: `Detail ${index}` })),
]
const hydrationLinks = [
  { rel: 'canonical' as const, href: '/docs' },
  { rel: 'alternate' as const, href: '/fr/docs', hreflang: 'fr' },
  { rel: 'icon' as const, href: '/favicon.svg', type: 'image/svg+xml' },
]
const managedStyle = { key: 'page-skin', textContent: '.page{display:grid}' }
const iconCss = '.icon{display:inline-block;--icon:url(/icon.svg)}\n'.repeat(1_000)
const generatedCss = '.layout{display:grid;grid-template-columns:1fr 2fr}\n'.repeat(7_000)

// Resource hints and inline payload sizes model the three Nuxt homepage samples.
// Only the matching client entries are pushed. Nuxt's resource hints and data stay in the DOM.
export const ssrHydrationHtml = `<!DOCTYPE html><html lang="en"><head>
<title>Example Docs</title>
${hydrationMeta.map(props => `<meta ${Object.entries(props).map(([k, v]) => `${k}="${v}"`).join(' ')}>`).join('\n')}
${hydrationLinks.map(props => `<link ${Object.entries(props).map(([k, v]) => `${k}="${v}"`).join(' ')}>`).join('\n')}
${Array.from({ length: 72 }, (_, index) => `<link rel="${index < 15 ? 'modulepreload' : 'prefetch'}" as="script" crossorigin href="/_nuxt/chunk-${index}.js">`).join('\n')}
<link rel="stylesheet" href="/_nuxt/site.css" crossorigin>
<style>${generatedCss}</style>
<style id="ssr-icons">${iconCss}</style>
<style data-hid="${managedStyle.key}">${managedStyle.textContent}</style>
</head><body class="site"><div id="__nuxt">Example Docs</div>
<script type="application/json" id="__NUXT_DATA__" data-nuxt-data="nuxt-app" data-ssr>["${'payload '.repeat(4_300)}"]</script>
</body></html>`

export function hydrateSsrHead(createHead: typeof CreateHead, document: Document) {
  return createHead({ document }).push({
    title: 'Example Docs',
    htmlAttrs: { lang: 'en' },
    bodyAttrs: { class: 'site' },
    meta: hydrationMeta,
    link: hydrationLinks,
    style: [managedStyle],
  })
}

export function createCsrWorkload(createHead: typeof CreateHead, document: Document, scenario: CsrScenario) {
  if (scenario === 'router-fresh' || scenario === 'router-long' || scenario === 'large-fresh' || scenario === 'large-long') {
    const large = scenario === 'large-fresh' || scenario === 'large-long'
    const session = createNavigationSession(createHead, document, large ? 'large-app' : 'router-hints')
    session.navigateSync(scenario === 'large-long' ? 1000 : scenario === 'router-long' ? 500 : 30)
    return () => session.navigateSync(1)
  }

  const head = createHead({ document })
  let page = 0
  const pageHead = () => ({
    title: `Page ${page}`,
    meta: Array.from({ length: 128 }, (_, i) => ({ name: `detail-${i}`, content: i === 0 ? `Page ${page}` : `Detail ${i}` })),
    link: [{ rel: 'preload' as const, as: 'image' as const, href: `/hero-${scenario === 'missing' ? page : 0}.webp` }],
  })
  const entry = head.push(pageHead())
  if (scenario === 'idle') {
    return () => {
      for (let i = 0; i < 1000; i++)
        head.render()
    }
  }
  return () => {
    page++
    entry.patch(pageHead())
  }
}

function stats(samples: number[]) {
  const value = samples.reduce((sum, sample) => sum + sample, 0) / samples.length
  const variance = samples.reduce((sum, sample) => sum + (sample - value) ** 2, 0) / (samples.length - 1)
  return { value, rme: value === 0 ? 0 : 1.96 * Math.sqrt(variance / samples.length) / value * 100 }
}

async function measureHydration(createHead: typeof CreateHead, JSDOM: typeof import('jsdom').JSDOM): Promise<PerfBench[]> {
  const cpu: number[] = []
  const wall: number[] = []
  const runs = 32
  const dom = new JSDOM(ssrHydrationHtml)
  const clone = () => dom.window.document.cloneNode(true) as Document
  try {
    for (let i = 0; i < runs; i++) hydrateSsrHead(createHead, clone())
    for (let rep = 0; rep < 12; rep++) {
      await setImmediate()
      // Exclude HTML parsing, DOM cloning, and the pre-sample collection from renderer CPU.
      const documents = Array.from({ length: runs }, clone)
      globalThis.gc!()
      const beforeCpu = process.cpuUsage()
      const beforeWall = performance.now()
      for (const document of documents) hydrateSsrHead(createHead, document)
      wall.push((performance.now() - beforeWall) / runs)
      const usage = process.cpuUsage(beforeCpu)
      cpu.push((usage.user + usage.system) / 1000 / runs)
    }
  }
  finally {
    dom.window.close()
  }
  return [
    { id: 'csr-ssr-hydration-cpu', name: 'CSR first render, Nuxt-style SSR head (CPU / hydration)', kind: 'time', category: 'hydration', ...stats(cpu) },
    { id: 'csr-ssr-hydration-wall', name: 'CSR first render, Nuxt-style SSR head (wall / hydration)', kind: 'time', category: 'hydration', ...stats(wall), informational: true },
  ]
}

async function measureScenario(createHead: typeof CreateHead, JSDOM: typeof import('jsdom').JSDOM, scenario: CsrScenario): Promise<PerfBench[]> {
  const cpu: number[] = []
  const wall: number[] = []
  const runs = 100
  const definition = scenarios[scenario]
  const createDom = () => new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
  // Warm up separately so both history lengths start each sample at a known age.
  const warmup = createDom()
  try {
    const render = createCsrWorkload(createHead, warmup.window.document, scenario)
    for (let i = 0; i < runs; i++) render()
  }
  finally {
    warmup.window.close()
  }
  for (let rep = 0; rep < 12; rep++) {
    await setImmediate()
    globalThis.gc!()
    const dom = createDom()
    try {
      const render = createCsrWorkload(createHead, dom.window.document, scenario)
      if (scenario === 'idle' || scenario === 'cached' || scenario === 'missing') {
        for (let i = 0; i < 30; i++) render()
      }
      globalThis.gc!()
      const beforeCpu = process.cpuUsage()
      const beforeWall = performance.now()
      for (let i = 0; i < runs; i++) render()
      wall.push((performance.now() - beforeWall) / runs)
      const usage = process.cpuUsage(beforeCpu)
      cpu.push((usage.user + usage.system) / 1000 / runs)
    }
    finally {
      dom.window.close()
    }
  }

  await setImmediate()
  const dom = createDom()
  let reads: DomReads
  try {
    const render = createCsrWorkload(createHead, dom.window.document, scenario)
    if (scenario === 'idle' || scenario === 'cached' || scenario === 'missing') {
      for (let i = 0; i < 30; i++) render()
    }
    const total = observeDomReads(dom.window.document, () => {
      for (let i = 0; i < runs; i++) render()
    })
    reads = { connectivity: total.connectivity / runs, scans: total.scans / runs }
  }
  finally {
    dom.window.close()
  }
  return [
    { id: `csr-cache-${scenario}-cpu`, name: `${definition.name} (CPU / ${definition.unit})`, kind: 'time', ...stats(cpu) },
    { id: `csr-cache-${scenario}-wall`, name: `${definition.name} (wall / ${definition.unit})`, kind: 'time', ...stats(wall), informational: true },
    { id: `csr-cache-${scenario}-scans`, name: `${definition.name} DOM scans / ${definition.unit}`, kind: 'count', category: 'cpu', value: reads.scans, informational: true },
    { id: `csr-cache-${scenario}-connectivity`, name: `${definition.name} connectivity reads / ${definition.unit}`, kind: 'count', category: 'cpu', value: reads.connectivity, informational: true },
  ]
}

if (import.meta.main) {
  if (typeof globalThis.gc !== 'function')
    throw new TypeError('Run with node --expose-gc to measure CSR CPU work.')
  // CI copies the harness to /tmp. Load dependencies and shipped code from cwd.
  const require = createRequire(`${process.cwd()}/package.json`)
  const { JSDOM } = require('jsdom') as typeof import('jsdom')
  const { createHead } = require(`${process.cwd()}/packages/unhead/dist/client.mjs`) as typeof import('unhead/client')
  const result: PerfRun = { benches: [] }
  // eslint-disable-next-line antfu/no-top-level-await -- standalone Node benchmark entry point
  result.benches.push(...await measureHydration(createHead, JSDOM))
  for (const scenario of Object.keys(scenarios) as CsrScenario[]) {
    // eslint-disable-next-line antfu/no-top-level-await -- standalone Node benchmark entry point
    result.benches.push(...await measureScenario(createHead, JSDOM, scenario))
  }
  // eslint-disable-next-line no-console -- stdout is the CI report protocol
  console.log(JSON.stringify(result))
}
