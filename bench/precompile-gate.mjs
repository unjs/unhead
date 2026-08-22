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
const clientCpu = comparison('precompile-client-e2e-cpu')
const clientHeap = comparison('precompile-client-e2e-heap')
const clientOffHeap = bench('off', 'precompile-client-e2e-heap')
const clientOnHeap = bench('on', 'precompile-client-e2e-heap')
if (!createCpu || !resolveCpu || !cpu || !heap || !offHeap || !onHeap || !clientCpu || !clientHeap || !clientOffHeap || !clientOnHeap)
  throw new Error('Experimental precompile result is missing required comparisons.')
for (const [name, value] of Object.entries({ createCpu: createCpu.deltaPct, createCpuCi: createCpu.pairedCi95Pct, resolveCpu: resolveCpu.deltaPct, resolveCpuCi: resolveCpu.pairedCi95Pct, cpu: cpu.deltaPct, cpuCi: cpu.pairedCi95Pct, heap: heap.deltaPct, heapCiUpper: heap.pairedCi95UpperPct, offHeap: offHeap.value, onHeap: onHeap.value, clientCpu: clientCpu.deltaPct, clientCpuCi: clientCpu.pairedCi95Pct, clientHeap: clientHeap.deltaPct, clientHeapCiUpper: clientHeap.pairedCi95UpperPct, clientOffHeap: clientOffHeap.value, clientOnHeap: clientOnHeap.value })) {
  if (!Number.isFinite(value))
    throw new Error(`Experimental precompile result has an invalid ${name} metric.`)
}

const dist = path.resolve('bench/bundle/dist')
const gzip = variant => zlib.gzipSync(fs.readFileSync(path.join(dist, `precompile-runtime-${variant}/vue-server/precompile-runtime.mjs`))).length
const offGzip = gzip('off')
const onGzip = gzip('on')
const gzipOverhead = onGzip - offGzip
const gzipDeltaPct = (gzipOverhead / offGzip) * 100
const clientGzip = variant => zlib.gzipSync(fs.readFileSync(path.join(dist, `precompile-client-runtime-${variant}/client/precompile-runtime.mjs`))).length
const clientOffGzip = clientGzip('off')
const clientOnGzip = clientGzip('on')
const clientGzipOverhead = clientOnGzip - clientOffGzip
const clientGzipDeltaPct = (clientGzipOverhead / clientOffGzip) * 100
const profileGzip = relative => zlib.gzipSync(fs.readFileSync(path.join(dist, relative))).length
const serverSnapshotGzip = profileGzip('precompile-runtime-snapshot/vue-server/precompile-snapshot.mjs')
const serverUniqueGzip = profileGzip('precompile-runtime-unique/vue-server/precompile-unique.mjs')
const clientCsrGzip = profileGzip('precompile-client-runtime-csr/client/precompile-runtime.mjs')
const clientSnapshotGzip = profileGzip('precompile-client-runtime-snapshot/client/precompile-snapshot.mjs')
const clientDeferredInitialGzip = profileGzip('precompile-client-runtime-deferred/client/precompile-runtime.mjs')
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
if (clientCpu.deltaPct + clientCpu.pairedCi95Pct > -30)
  failures.push(`client mount + dispose CPU improvement missed the gate (${clientCpu.deltaPct.toFixed(1)}% ±${clientCpu.pairedCi95Pct.toFixed(1)} pp)`)
const clientHeapSavings = clientOffHeap.value - clientOnHeap.value
if (clientHeap.pairedCi95UpperPct > -15 || clientHeapSavings <= 1024)
  failures.push(`client transient heap improvement missed the gate (${clientHeap.deltaPct.toFixed(1)}%, 95% upper ${clientHeap.pairedCi95UpperPct.toFixed(1)}%, ${Math.round(clientHeapSavings)} B)`)
if (clientGzipDeltaPct > -30 || clientGzipOverhead > -1024)
  failures.push(`sealed client entry missed the bundle gate (${clientGzipOverhead > 0 ? '+' : ''}${clientGzipOverhead} B, ${clientGzipDeltaPct.toFixed(1)}% gzip)`)
if (serverSnapshotGzip / onGzip > 0.8)
  failures.push(`server snapshot did not beat the lifecycle runtime by 20% gzip (${serverSnapshotGzip} B vs ${onGzip} B)`)
if (serverUniqueGzip >= onGzip)
  failures.push(`server unique profile did not beat the lifecycle runtime (${serverUniqueGzip} B vs ${onGzip} B)`)
if (clientCsrGzip / clientOnGzip > 0.9)
  failures.push(`client CSR profile did not beat the adopting runtime by 10% gzip (${clientCsrGzip} B vs ${clientOnGzip} B)`)
if (clientSnapshotGzip / clientOnGzip > 0.9)
  failures.push(`client snapshot did not beat the lifecycle runtime by 10% gzip (${clientSnapshotGzip} B vs ${clientOnGzip} B)`)
if (clientDeferredInitialGzip / clientOnGzip > 0.75)
  failures.push(`deferred client initial chunk did not beat eager by 25% gzip (${clientDeferredInitialGzip} B vs ${clientOnGzip} B)`)

console.log(`Precompile gate: server bundle ${gzipOverhead} B (${gzipDeltaPct.toFixed(1)}%) gzip, create CPU ${createCpu.deltaPct.toFixed(1)}%, resolve CPU ${resolveCpu.deltaPct.toFixed(1)}% ±${resolveCpu.pairedCi95Pct.toFixed(1)} pp, e2e CPU ${cpu.deltaPct.toFixed(1)}%, heap ${heap.deltaPct.toFixed(1)}% (95% upper ${heap.pairedCi95UpperPct.toFixed(1)}%); client bundle ${clientGzipOverhead} B (${clientGzipDeltaPct.toFixed(1)}%), CPU ${clientCpu.deltaPct.toFixed(1)}%, heap ${clientHeap.deltaPct.toFixed(1)}%`)
if (failures.length)
  throw new Error(failures.join('; '))
