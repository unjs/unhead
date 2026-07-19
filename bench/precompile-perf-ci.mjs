// Same-commit comparison for the experimental precompile mode. Both modules
// come from one source fixture and differ only by the precompile transform.
// Output is one JSON line for the bundle-size PR report.
import { pathToFileURL } from 'node:url'

const bundle = variant => import(pathToFileURL(`${process.cwd()}/bench/bundle/dist/precompile-runtime-${variant}/vue-server/precompile-runtime.mjs`).href)
const [off, on] = await Promise.all([bundle('off'), bundle('on')])

if (typeof globalThis.gc !== 'function')
  throw new TypeError('Run with node --expose-gc so heap growth can be measured.')

if (JSON.stringify(off.renderStaticHead()) !== JSON.stringify(on.renderStaticHead()))
  throw new Error('Experimental precompile runtime output did not match the disabled mode.')

function forceGC() {
  globalThis.gc()
  globalThis.gc()
}

function stats(samples) {
  const value = samples.reduce((sum, sample) => sum + sample, 0) / samples.length
  const variance = samples.reduce((sum, sample) => sum + (sample - value) ** 2, 0) / (samples.length - 1)
  const sem = Math.sqrt(variance) / Math.sqrt(samples.length)
  return { value, sem, rme: value ? Math.abs((sem * 1.96 / value) * 100) : 0 }
}

function pairedComparison(offSamples, onSamples) {
  const offValue = stats(offSamples).value
  const onValue = stats(onSamples).value
  const differences = offSamples.map((sample, index) => onSamples[index] - sample)
  const difference = stats(differences)
  return {
    deltaPct: ((onValue - offValue) / offValue) * 100,
    pairedCi95Pct: (difference.sem * 1.96 / offValue) * 100,
  }
}

function measureCpuBatch(fn, runs) {
  const before = process.hrtime.bigint()
  for (let i = 0; i < runs; i++)
    fn()
  return Number(process.hrtime.bigint() - before) / 1e6
}

function calibrateRuns(offFn, onFn, minRuns, targetMs = 120) {
  const calibrate = (fn) => {
    let runs = minRuns
    for (let attempt = 0; attempt < 4; attempt++) {
      forceGC()
      const elapsed = measureCpuBatch(fn, runs)
      if (elapsed >= targetMs * 0.9)
        return runs
      runs = Math.ceil(runs * targetMs / Math.max(elapsed, 0.25))
    }
    return runs
  }
  return Math.max(calibrate(offFn), calibrate(onFn))
}

// Alternate which mode runs first so JIT warmup and runner drift do not favor a mode.
function measureCpu(id, name, offFn, onFn, { warmup = 150, reps = 28, minRuns = 200 } = {}) {
  for (let i = 0; i < warmup; i++) {
    offFn()
    onFn()
  }
  const runs = calibrateRuns(offFn, onFn, minRuns)
  const samples = { off: [], on: [] }
  const measure = fn => measureCpuBatch(fn, runs) / runs
  for (let rep = 0; rep < reps; rep++) {
    const order = rep % 2 ? [['on', onFn], ['off', offFn]] : [['off', offFn], ['on', onFn]]
    for (const [mode, fn] of order) {
      forceGC()
      samples[mode].push(measure(fn))
    }
  }
  return {
    comparison: { id, ...pairedComparison(samples.off, samples.on) },
    off: { id, name, kind: 'time', iterationsPerSample: runs, ...stats(samples.off) },
    on: { id, name, kind: 'time', iterationsPerSample: runs, ...stats(samples.on) },
  }
}

function measureHeapGrowth(offFn, onFn, { warmup = 100, reps = 25, runs = 10 } = {}) {
  for (let i = 0; i < warmup; i++) {
    offFn()
    onFn()
  }
  const samples = { off: [], on: [] }
  const measure = (fn) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      forceGC()
      const before = process.memoryUsage().heapUsed
      for (let i = 0; i < runs; i++) fn()
      const value = (process.memoryUsage().heapUsed - before) / runs
      if (value >= 0)
        return value
    }
    throw new Error('A GC interrupted every experimental precompile heap-growth sample.')
  }
  for (let rep = 0; rep < reps; rep++) {
    const order = rep % 2 ? [['on', onFn], ['off', offFn]] : [['off', offFn], ['on', onFn]]
    for (const [mode, fn] of order)
      samples[mode].push(measure(fn))
  }
  for (const mode of ['off', 'on'])
    samples[mode].sort((a, b) => a - b)
  const offValue = samples.off[samples.off.length >> 1]
  const onValue = samples.on[samples.on.length >> 1]
  return {
    comparison: { id: 'precompile-static-e2e-heap', deltaPct: ((onValue - offValue) / offValue) * 100 },
    off: { id: 'precompile-static-e2e-heap', name: 'Static SSR transient heap growth / render', kind: 'alloc', value: offValue },
    on: { id: 'precompile-static-e2e-heap', name: 'Static SSR transient heap growth / render', kind: 'alloc', value: onValue },
  }
}

const stages = [
  measureCpu('precompile-static-create-cpu', 'Static SSR create (CPU)', off.createStaticHead, on.createStaticHead, { minRuns: 300 }),
  measureCpu('precompile-static-resolve-cpu', 'Static SSR create + resolve (CPU)', off.resolveStaticHead, on.resolveStaticHead),
  measureCpu('precompile-static-e2e-cpu', 'Static SSR create + render (CPU)', off.renderStaticHead, on.renderStaticHead),
]
const heap = measureHeapGrowth(off.renderStaticHead, on.renderStaticHead)

console.log(JSON.stringify({
  schemaVersion: 1,
  fixture: 'static-product-page',
  comparisons: [...stages.map(stage => stage.comparison), heap.comparison],
  off: { benches: [...stages.map(stage => stage.off), heap.off] },
  on: { benches: [...stages.map(stage => stage.on), heap.on] },
}))
