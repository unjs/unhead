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

let benchmarkSink = 0
const consumeCreate = head => Array.isArray(head._p) ? head._p.length : head.entries.size
const consumeResolve = tags => tags.length
const consumeRender = payload => payload.headTags.length + payload.bodyTags.length + payload.bodyTagsOpen.length + payload.htmlAttrs.length + payload.bodyAttrs.length

if (consumeCreate(off.createStaticHead()) !== consumeCreate(on.createStaticHead()))
  throw new Error('Experimental precompile runtime did not collect the same number of entries.')

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

function median(samples) {
  const sorted = [...samples].sort((a, b) => a - b)
  return sorted[sorted.length >> 1]
}

// Deterministic paired bootstrap: resample each OFF/ON repetition together,
// then compare the two medians. The fixed generator keeps CI reproducible.
function pairedMedianInterval(offSamples, onSamples, reps = 2000) {
  let state = 0x6D2B79F5
  const randomIndex = () => {
    state = Math.imul(state ^ state >>> 15, state | 1)
    state ^= state + Math.imul(state ^ state >>> 7, state | 61)
    return ((state ^ state >>> 14) >>> 0) % offSamples.length
  }
  const deltas = []
  for (let rep = 0; rep < reps; rep++) {
    const sampledOff = []
    const sampledOn = []
    for (let i = 0; i < offSamples.length; i++) {
      const index = randomIndex()
      sampledOff.push(offSamples[index])
      sampledOn.push(onSamples[index])
    }
    const offValue = median(sampledOff)
    deltas.push(((median(sampledOn) - offValue) / offValue) * 100)
  }
  deltas.sort((a, b) => a - b)
  return {
    pairedCi95LowerPct: deltas[Math.floor(reps * 0.025)],
    pairedCi95UpperPct: deltas[Math.floor(reps * 0.975)],
  }
}

function measureCpuBatch(fn, consume, runs) {
  const before = process.hrtime.bigint()
  for (let i = 0; i < runs; i++)
    benchmarkSink = (benchmarkSink + consume(fn())) | 0
  return Number(process.hrtime.bigint() - before) / 1e6
}

function calibrateRuns(fn, consume, minRuns, targetMs = 120) {
  let runs = minRuns
  for (let attempt = 0; attempt < 4; attempt++) {
    forceGC()
    const elapsed = measureCpuBatch(fn, consume, runs)
    if (elapsed >= targetMs * 0.9)
      return runs
    runs = Math.ceil(runs * targetMs / Math.max(elapsed, 0.25))
  }
  return runs
}

// Alternate which mode runs first so JIT warmup and runner drift do not favor a mode.
function measureCpu(id, name, offFn, onFn, consume, { warmup = 150, reps = 28, minRuns = 200 } = {}) {
  for (let i = 0; i < warmup; i++) {
    benchmarkSink = (benchmarkSink + consume(offFn()) + consume(onFn())) | 0
  }
  // Calibrate each arm independently. A sealed plan can be several times
  // faster than the normal runtime; using the faster arm's run count for both
  // turns every normal-runtime sample into an unnecessarily long stress test.
  const runs = {
    off: calibrateRuns(offFn, consume, minRuns),
    on: calibrateRuns(onFn, consume, minRuns),
  }
  const samples = { off: [], on: [] }
  for (let rep = 0; rep < reps; rep++) {
    const order = rep % 2 ? [['on', onFn], ['off', offFn]] : [['off', offFn], ['on', onFn]]
    for (const [mode, fn] of order) {
      forceGC()
      samples[mode].push(measureCpuBatch(fn, consume, runs[mode]) / runs[mode])
    }
  }
  return {
    comparison: { id, ...pairedComparison(samples.off, samples.on) },
    off: { id, name, kind: 'time', iterationsPerSample: runs.off, ...stats(samples.off) },
    on: { id, name, kind: 'time', iterationsPerSample: runs.on, ...stats(samples.on) },
  }
}

function measureHeapGrowth(offFn, onFn, consume, { warmup = 100, reps = 25, runs = 10 } = {}) {
  for (let i = 0; i < warmup; i++) {
    benchmarkSink = (benchmarkSink + consume(offFn()) + consume(onFn())) | 0
  }
  const samples = { off: [], on: [] }
  const measure = (fn) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      forceGC()
      const before = process.memoryUsage().heapUsed
      for (let i = 0; i < runs; i++)
        benchmarkSink = (benchmarkSink + consume(fn())) | 0
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
  const offValue = median(samples.off)
  const onValue = median(samples.on)
  return {
    comparison: {
      id: 'precompile-static-e2e-heap',
      deltaPct: ((onValue - offValue) / offValue) * 100,
      ...pairedMedianInterval(samples.off, samples.on),
    },
    off: { id: 'precompile-static-e2e-heap', name: 'Static SSR transient heap growth / render', kind: 'alloc', value: offValue },
    on: { id: 'precompile-static-e2e-heap', name: 'Static SSR transient heap growth / render', kind: 'alloc', value: onValue },
  }
}

const stages = [
  measureCpu('precompile-static-create-cpu', 'Static SSR create (CPU)', off.createStaticHead, on.createStaticHead, consumeCreate, { minRuns: 300 }),
  measureCpu('precompile-static-resolve-cpu', 'Static SSR create + resolve (CPU)', off.resolveStaticHead, on.resolveStaticHead, consumeResolve),
  measureCpu('precompile-static-e2e-cpu', 'Static SSR create + render (CPU)', off.renderStaticHead, on.renderStaticHead, consumeRender),
]
const heap = measureHeapGrowth(off.renderStaticHead, on.renderStaticHead, consumeRender)

console.log(JSON.stringify({
  schemaVersion: 1,
  fixture: 'static-product-page',
  benchmarkSink,
  comparisons: [...stages.map(stage => stage.comparison), heap.comparison],
  off: { benches: [...stages.map(stage => stage.off), heap.off] },
  on: { benches: [...stages.map(stage => stage.on), heap.on] },
}))
