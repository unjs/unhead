/* eslint-disable no-console, antfu/no-top-level-await -- a standalone harness, like the ignored .mjs ones in bench */
// Hydration head work of 20 components with one head call each: v3 `useHead`, lazy
// loose `useHead`, and lazy compiled `useCompiledHead`, with and without values. It imports
// built dist, so run `pnpm build` first.
//
// Two timings per hydration, in Vue's production build. The window: create the head,
// create the SSR app, install the head, hydrate with `mount`, and make the call a
// framework makes when hydration ends (`head.render()`). The head time: the parts of that
// window that are head work, timed directly, which are creating and installing the head,
// each head call in setup, and the final `head.render()`. The full runtime head pauses rendering
// during hydration through `dom:beforeRender`, as Nuxt does, so its one DOM render falls
// in that final call. A lazy head defers its DOM work to idle, outside the window.
// The document is reset outside the window.
//
//   node bench/compiled-hydration-perf.ts
import os from 'node:os'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

const dist = (pkg: string, name: string) => import(pathToFileURL(`${process.cwd()}/packages/${pkg}/dist/${name}`).href)

const ROUNDS = Number(process.env.ROUNDS || 15)
const BATCH = Number(process.env.BATCH || 40)
const WARMUP = Number(process.env.WARMUP || 200)

process.env.NODE_ENV = 'production'

// Vue's DOM runtime reads these globals, so one window serves every iteration
const window = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>').window
for (const key of ['window', 'document', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'Text', 'Comment', 'DocumentFragment', 'MutationObserver', 'Event', 'CustomEvent'])
  Object.defineProperty(globalThis, key, { value: key === 'window' ? window : (window as any)[key], configurable: true, writable: true })
const document = window.document

const vue = await import('vue')
const { renderToString } = await import('vue/server-renderer')
const { useHead } = await dist('vue', 'index.mjs')
const { createHead: createClientHead } = await dist('vue', 'client.mjs')
const { createHead: createServerHead, renderSSRHead } = await dist('vue', 'server.mjs')
const { createLazyHead, acceptCompiledTags } = await dist('vue', 'lazy.mjs')
const { useCompiledHead } = await dist('vue', 'compiled.mjs')
const { compileTags, dynamicValue } = await dist('unhead', 'compiled/compile.mjs')

const COMPONENTS = 20
const input = (i: number, content: unknown) => ({ meta: [{ name: `component-${i}`, content }], link: [{ rel: 'prefetch', href: `/chunk-${i}.js` }] })
function compiledTags(value: unknown, dynamicValues?: number) {
  const result = compileTags(value, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}
const staticTagSets = Array.from({ length: COMPONENTS }, (_, i) => compiledTags(input(i, `value ${i}`)))
const dynamicValueTagSets = Array.from({ length: COMPONENTS }, (_, i) => compiledTags(input(i, dynamicValue(0)), 1))

type Call = (i: number) => void
const calls: Record<string, Call | undefined> = {
  'none': undefined,
  'useHead': i => useHead(input(i, `value ${i}`)),
  'useHead ref': i => useHead(input(i, vue.ref(`value ${i}`))),
  'useCompiledHead': i => useCompiledHead(staticTagSets[i]),
  'useCompiledHead value': i => useCompiledHead(dynamicValueTagSets[i], [vue.ref(`value ${i}`)]),
}

let headTime = 0
const parts = { setup: 0, calls: 0, render: 0 }
function timed<T>(fn: () => T, part: keyof typeof parts = 'setup'): T {
  const start = performance.now()
  const result = fn()
  const spent = performance.now() - start
  headTime += spent
  parts[part] += spent
  return result
}

function app(call: Call | undefined) {
  const children = Array.from({ length: COMPONENTS }, (_, i) => vue.defineComponent({
    setup() {
      if (call)
        timed(() => call(i), 'calls')
      return () => vue.h('p', `component ${i}`)
    },
  }))
  return vue.defineComponent({ setup: () => () => vue.h('main', children.map(child => vue.h(child))) })
}

// one server render gives the page every variant hydrates
const server = createServerHead({ disableDefaults: true })
const html = await renderToString(vue.createSSRApp(app(calls.useHead)).use(server))
const { headTags } = renderSSRHead(server)

function reset() {
  document.head.innerHTML = headTags
  document.body.innerHTML = `<div id="app">${html}</div>`
}

interface Variant { name: string, run: () => () => void }
const variants: Variant[] = [
  { name: 'vue only', run: () => {
    const a = vue.createSSRApp(app(undefined))
    a.mount('#app')
    return () => a.unmount()
  } },
]
for (const [callName, head] of [['useHead', 'v3'], ['useHead ref', 'v3'], ['useHead', 'lazy'], ['useHead ref', 'lazy'], ['useCompiledHead', 'lazy'], ['useCompiledHead value', 'lazy']] as const) {
  const component = app(calls[callName])
  variants.push({
    name: `${head} ${callName}`,
    run: () => {
      if (head === 'v3') {
        let paused = true
        const h = timed(() => {
          const created = createClientHead({ document })
          created.hooks.hook('dom:beforeRender', (ctx: any) => {
            ctx.shouldRender = !paused
          })
          return created
        })
        const a = vue.createSSRApp(component)
        timed(() => a.use(h))
        a.mount('#app')
        paused = false
        timed(() => h.render(), 'render')
        return () => a.unmount()
      }
      const h = timed(() => callName.startsWith('useCompiledHead') ? acceptCompiledTags(createLazyHead({ document })) : createLazyHead({ document }))
      const a = vue.createSSRApp(component)
      timed(() => a.use(h))
      a.mount('#app')
      timed(() => h.render(), 'render')
      // outside the window: cancel the idle load, so no runtime renders into the next page
      return () => {
        h.blockLoad()
        a.unmount()
      }
    },
  })
}

const split: Record<string, typeof parts[]> = {}
function sample(variant: Variant) {
  let total = 0
  headTime = 0
  parts.setup = parts.calls = parts.render = 0
  for (let i = 0; i < BATCH; i++) {
    reset()
    const start = performance.now()
    const done = variant.run()
    total += performance.now() - start
    done()
  }
  ;(split[variant.name] ||= []).push({ setup: parts.setup / BATCH, calls: parts.calls / BATCH, render: parts.render / BATCH })
  return [total / BATCH, headTime / BATCH] as const
}

for (const variant of variants) {
  for (let i = 0; i < WARMUP / BATCH; i++)
    sample(variant)
}
const windows: Record<string, number[]> = Object.fromEntries(variants.map(v => [v.name, []]))
const heads: Record<string, number[]> = Object.fromEntries(variants.map(v => [v.name, []]))
const load = [os.loadavg()]
for (let r = 0; r < ROUNDS; r++) {
  for (const variant of variants) {
    const [window, head] = sample(variant)
    windows[variant.name]!.push(window)
    heads[variant.name]!.push(head)
  }
}
load.push(os.loadavg())

const median = (values: number[]) => [...values].sort((a, b) => a - b)[values.length >> 1]!
const head = (name: string) => median(heads[name]!)
const rows = variants.map(v => ({
  'variant': v.name,
  'µs window': Number((median(windows[v.name]!) * 1000).toFixed(1)),
  'µs head': Number((head(v.name) * 1000).toFixed(1)),
  'µs create+install': Number((median(split[v.name]!.map(p => p.setup)) * 1000).toFixed(1)),
  'µs calls': Number((median(split[v.name]!.map(p => p.calls)) * 1000).toFixed(1)),
  'µs end render': Number((median(split[v.name]!.map(p => p.render)) * 1000).toFixed(1)),
}))
console.table(rows)
const ratio = (a: string, b: string) => Number((head(a) / head(b)).toFixed(2))
console.log(JSON.stringify({
  node: process.version,
  rounds: ROUNDS,
  batch: BATCH,
  loadavg: load,
  cpus: os.cpus().length,
  ratios: {
    'v3 useHead / lazy useCompiledHead': ratio('v3 useHead', 'lazy useCompiledHead'),
    'v3 useHead ref / lazy useCompiledHead value': ratio('v3 useHead ref', 'lazy useCompiledHead value'),
    'lazy useHead / lazy useCompiledHead': ratio('lazy useHead', 'lazy useCompiledHead'),
    'lazy useHead ref / lazy useCompiledHead value': ratio('lazy useHead ref', 'lazy useCompiledHead value'),
    'v3 useHead / lazy useHead': ratio('v3 useHead', 'lazy useHead'),
  },
}))
