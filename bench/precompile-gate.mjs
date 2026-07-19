import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import zlib from 'node:zlib'

const perfPath = process.argv[2] || process.env.PRECOMPILE_PERF
if (!perfPath || !fs.existsSync(perfPath))
  throw new Error('Missing experimental precompile performance result.')

const perf = JSON.parse(fs.readFileSync(perfPath, 'utf8'))
const comparison = id => perf.comparisons.find(item => item.id === id)
const bench = (variant, id) => perf[variant]?.benches?.find(item => item.id === id)
const resolveCpu = comparison('precompile-static-resolve-cpu')
const cpu = comparison('precompile-static-e2e-cpu')
const heap = comparison('precompile-static-e2e-heap')
const offHeap = bench('off', 'precompile-static-e2e-heap')
const onHeap = bench('on', 'precompile-static-e2e-heap')
if (!resolveCpu || !cpu || !heap || !offHeap || !onHeap)
  throw new Error('Experimental precompile result is missing required comparisons.')
for (const [name, value] of Object.entries({ resolveCpu: resolveCpu.deltaPct, resolveCpuCi: resolveCpu.pairedCi95Pct, cpu: cpu.deltaPct, cpuCi: cpu.pairedCi95Pct, heap: heap.deltaPct, offHeap: offHeap.value, onHeap: onHeap.value })) {
  if (!Number.isFinite(value))
    throw new Error(`Experimental precompile result has an invalid ${name} metric.`)
}

const dist = path.resolve('bench/bundle/dist')
const gzip = variant => zlib.gzipSync(fs.readFileSync(path.join(dist, `precompile-runtime-${variant}/vue-server/precompile-runtime.mjs`))).length
const offGzip = gzip('off')
const onGzip = gzip('on')
const gzipOverhead = onGzip - offGzip
const failures = []
const ordinaryBundles = [
  'client/client/minimal.mjs',
  'client-sc/client/minimal.mjs',
  'server/server/minimal.mjs',
  'server-sc/server/minimal.mjs',
]
const strictMarkers = ['precompiled-only runtime', '[unhead:pc]']

for (const relativePath of ordinaryBundles) {
  const file = path.join(dist, relativePath)
  if (!fs.existsSync(file)) {
    failures.push(`missing ordinary isolation fixture (${relativePath})`)
    continue
  }
  const output = fs.readFileSync(file, 'utf8')
  const marker = strictMarkers.find(value => output.includes(value))
  if (marker)
    failures.push(`strict runtime leaked into ${relativePath} (${marker})`)
}

if (resolveCpu.deltaPct + resolveCpu.pairedCi95Pct >= 0)
  failures.push(`create + resolve CPU improvement is not significant (${resolveCpu.deltaPct.toFixed(1)}% ±${resolveCpu.pairedCi95Pct.toFixed(1)} pp)`)
if (cpu.deltaPct >= 0)
  failures.push(`end-to-end CPU did not improve (${cpu.deltaPct.toFixed(1)}%)`)
const heapSavings = offHeap.value - onHeap.value
if (heap.deltaPct > -2 || heapSavings <= 1024)
  failures.push(`transient heap improvement was within the noise gate (${heap.deltaPct.toFixed(1)}%, ${Math.round(heapSavings)} B)`)
if (gzipOverhead >= 0)
  failures.push(`precompiled-only entry did not reduce bundle size (${gzipOverhead > 0 ? '+' : ''}${gzipOverhead} B gzip)`)

console.log(`Precompile gate: bundle ${gzipOverhead > 0 ? '+' : ''}${gzipOverhead} B gzip, resolve CPU ${resolveCpu.deltaPct.toFixed(1)}% ±${resolveCpu.pairedCi95Pct.toFixed(1)} pp, e2e CPU ${cpu.deltaPct.toFixed(1)}%, heap ${heap.deltaPct.toFixed(1)}%`)
if (failures.length)
  throw new Error(failures.join('; '))
