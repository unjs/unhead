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
const createCpu = comparison('precompile-static-create-cpu')
const resolveCpu = comparison('precompile-static-resolve-cpu')
const cpu = comparison('precompile-static-e2e-cpu')
const heap = comparison('precompile-static-e2e-heap')
const offHeap = bench('off', 'precompile-static-e2e-heap')
const onHeap = bench('on', 'precompile-static-e2e-heap')
if (!createCpu || !resolveCpu || !cpu || !heap || !offHeap || !onHeap)
  throw new Error('Experimental precompile result is missing required comparisons.')
for (const [name, value] of Object.entries({ createCpu: createCpu.deltaPct, createCpuCi: createCpu.pairedCi95Pct, resolveCpu: resolveCpu.deltaPct, resolveCpuCi: resolveCpu.pairedCi95Pct, cpu: cpu.deltaPct, cpuCi: cpu.pairedCi95Pct, heap: heap.deltaPct, heapCiUpper: heap.pairedCi95UpperPct, offHeap: offHeap.value, onHeap: onHeap.value })) {
  if (!Number.isFinite(value))
    throw new Error(`Experimental precompile result has an invalid ${name} metric.`)
}

const dist = path.resolve('bench/bundle/dist')
const gzip = variant => zlib.gzipSync(fs.readFileSync(path.join(dist, `precompile-runtime-${variant}/vue-server/precompile-runtime.mjs`))).length
const offGzip = gzip('off')
const onGzip = gzip('on')
const gzipOverhead = onGzip - offGzip
const gzipDeltaPct = (gzipOverhead / offGzip) * 100
const failures = []
const ordinaryBundles = [
  'client/client/minimal.mjs',
  'client-sc/client/minimal.mjs',
  'server/server/minimal.mjs',
  'server-sc/server/minimal.mjs',
]
const strictMarkers = ['._p.push(']

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

if (createCpu.deltaPct + createCpu.pairedCi95Pct > -50)
  failures.push(`create CPU improvement missed the dramatic gate (${createCpu.deltaPct.toFixed(1)}% ±${createCpu.pairedCi95Pct.toFixed(1)} pp)`)
if (resolveCpu.deltaPct + resolveCpu.pairedCi95Pct > -50)
  failures.push(`create + resolve CPU improvement missed the dramatic gate (${resolveCpu.deltaPct.toFixed(1)}% ±${resolveCpu.pairedCi95Pct.toFixed(1)} pp)`)
if (cpu.deltaPct + cpu.pairedCi95Pct > -50)
  failures.push(`end-to-end CPU improvement missed the dramatic gate (${cpu.deltaPct.toFixed(1)}% ±${cpu.pairedCi95Pct.toFixed(1)} pp)`)
const heapSavings = offHeap.value - onHeap.value
if (heap.pairedCi95UpperPct > -50 || heapSavings <= 8192)
  failures.push(`transient heap improvement missed the dramatic gate (${heap.deltaPct.toFixed(1)}%, 95% upper ${heap.pairedCi95UpperPct.toFixed(1)}%, ${Math.round(heapSavings)} B)`)
if (gzipDeltaPct > -30 || gzipOverhead > -1024)
  failures.push(`sealed entry missed the dramatic bundle gate (${gzipOverhead > 0 ? '+' : ''}${gzipOverhead} B, ${gzipDeltaPct.toFixed(1)}% gzip)`)

console.log(`Precompile gate: bundle ${gzipOverhead} B (${gzipDeltaPct.toFixed(1)}%) gzip, create CPU ${createCpu.deltaPct.toFixed(1)}%, resolve CPU ${resolveCpu.deltaPct.toFixed(1)}% ±${resolveCpu.pairedCi95Pct.toFixed(1)} pp, e2e CPU ${cpu.deltaPct.toFixed(1)}%, heap ${heap.deltaPct.toFixed(1)}% (95% upper ${heap.pairedCi95UpperPct.toFixed(1)}%)`)
if (failures.length)
  throw new Error(failures.join('; '))
