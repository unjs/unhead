import type { BundleData } from './bundle-report'
import type { PerfBench, PerfRun } from './perf-report'

interface PrecompilePerfRun {
  comparisons: {
    deltaPct: number
    id: string
    pairedCi95Pct?: number
    pairedCi95LowerPct?: number
    pairedCi95UpperPct?: number
  }[]
  off: PerfRun
  on: PerfRun
}

function pct(before: number, after: number): number {
  return before ? ((after - before) / Math.abs(before)) * 100 : 0
}

function signed(value: number, suffix = ''): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix}`
}

function duration(value: number): string {
  return value < 0.01 ? `${(value * 1000).toFixed(2)} µs` : `${value.toFixed(3)} ms`
}

function mark(delta: number, meaningful = true): string {
  if (!meaningful)
    return '≈'
  return delta < 0 ? '🟢' : delta > 0 ? '🔴' : '✅'
}

function bench(run: PerfRun, id: string): PerfBench {
  const value = run.benches.find(item => item.id === id)
  if (!value)
    throw new Error(`Missing experimental precompile benchmark: ${id}`)
  return value
}

function comparison(run: PrecompilePerfRun, id: string) {
  const value = run.comparisons.find(item => item.id === id)
  if (!value)
    throw new Error(`Missing experimental precompile comparison: ${id}`)
  return value
}

export function renderPrecompileReport(bundles: BundleData[], perf: PrecompilePerfRun): string {
  const offBundle = bundles.find(item => item.name === 'Precompile Server Runtime (Off)')
  const onBundle = bundles.find(item => item.name === 'Precompile Server Runtime (On)')
  const clientOffBundle = bundles.find(item => item.name === 'Precompile Client Runtime (Off)')
  const clientOnBundle = bundles.find(item => item.name === 'Precompile Client Runtime (On)')
  if (!offBundle || !onBundle || !clientOffBundle || !clientOnBundle)
    throw new Error('Missing experimental precompile client/server runtime bundle pairs.')

  const offCreate = bench(perf.off, 'precompile-static-create-cpu')
  const onCreate = bench(perf.on, 'precompile-static-create-cpu')
  const createComparison = comparison(perf, 'precompile-static-create-cpu')
  const offResolve = bench(perf.off, 'precompile-static-resolve-cpu')
  const onResolve = bench(perf.on, 'precompile-static-resolve-cpu')
  const resolveComparison = comparison(perf, 'precompile-static-resolve-cpu')
  const offCpu = bench(perf.off, 'precompile-static-e2e-cpu')
  const onCpu = bench(perf.on, 'precompile-static-e2e-cpu')
  const cpuComparison = comparison(perf, 'precompile-static-e2e-cpu')
  const offAlloc = bench(perf.off, 'precompile-static-e2e-heap')
  const onAlloc = bench(perf.on, 'precompile-static-e2e-heap')
  const allocComparison = comparison(perf, 'precompile-static-e2e-heap')
  const clientOffCpu = bench(perf.off, 'precompile-client-e2e-cpu')
  const clientOnCpu = bench(perf.on, 'precompile-client-e2e-cpu')
  const clientCpuComparison = comparison(perf, 'precompile-client-e2e-cpu')
  const clientOffAlloc = bench(perf.off, 'precompile-client-e2e-heap')
  const clientOnAlloc = bench(perf.on, 'precompile-client-e2e-heap')
  const clientAllocComparison = comparison(perf, 'precompile-client-e2e-heap')

  const gzipDelta = onBundle.gzippedSize - offBundle.gzippedSize
  const cpuPct = cpuComparison.deltaPct
  const allocDelta = onAlloc.value - offAlloc.value
  const allocPct = pct(offAlloc.value, onAlloc.value)
  const cpuCi = cpuComparison.pairedCi95Pct || 0
  const createCpuCi = createComparison.pairedCi95Pct || 0
  const createCpuMeaningful = createComparison.deltaPct + createCpuCi < 0 || createComparison.deltaPct - createCpuCi > 0
  const resolveCpuPct = resolveComparison.deltaPct
  const resolveCpuCi = resolveComparison.pairedCi95Pct || 0
  const resolveCpuMeaningful = resolveCpuPct + resolveCpuCi < 0 || resolveCpuPct - resolveCpuCi > 0
  const cpuMeaningful = cpuPct + cpuCi < 0 || cpuPct - cpuCi > 0
  const allocMeaningful = Math.abs(allocDelta) > 1024 && Math.abs(allocPct) > 2
  const clientGzipDelta = clientOnBundle.gzippedSize - clientOffBundle.gzippedSize
  const clientCpuCi = clientCpuComparison.pairedCi95Pct || 0
  const clientCpuMeaningful = clientCpuComparison.deltaPct + clientCpuCi < 0 || clientCpuComparison.deltaPct - clientCpuCi > 0
  const clientAllocDelta = clientOnAlloc.value - clientOffAlloc.value
  const clientAllocPct = pct(clientOffAlloc.value, clientOnAlloc.value)
  const clientAllocMeaningful = Math.abs(clientAllocDelta) > 1024 && Math.abs(clientAllocPct) > 2

  const out = [
    '## 🧪 Experimental sealed precompile: client and server _(same commit)_',
    '',
    'The same static product metadata is built independently for `unhead/precompiled/client` and `unhead/precompiled/server`. Disabled uses the normal target runtime; enabled hoists build-finalized DOM or HTML plans. The client keeps disposal and DOM reconciliation but removes normalization, hooks, plugins, event handlers, patches, and dynamic inputs. The server collects merged plans, resolves execution-order duplicates, and joins serialized fragments. CPU samples alternate OFF/ON order and consume every result; memory is paired-bootstrap median transient heap growth.',
    '',
    '| Metric | Disabled | Enabled | Δ |',
    '|---|---:|---:|---:|',
    `| Server benchmark bundle (gzip) | ${offBundle.gzippedSize.toLocaleString()} B | ${onBundle.gzippedSize.toLocaleString()} B | ${mark(gzipDelta)} ${gzipDelta > 0 ? '+' : ''}${gzipDelta} B (${signed(pct(offBundle.gzippedSize, onBundle.gzippedSize), '%')}) |`,
    `| Static SSR create + collect (CPU) | ${duration(offCreate.value)} | ${duration(onCreate.value)} | ${mark(createComparison.deltaPct, createCpuMeaningful)} ${signed(createComparison.deltaPct, '%')} ±${createCpuCi.toFixed(1)} pp |`,
    `| Static SSR create + resolve (CPU) | ${duration(offResolve.value)} | ${duration(onResolve.value)} | ${mark(resolveCpuPct, resolveCpuMeaningful)} ${signed(resolveCpuPct, '%')} ±${resolveCpuCi.toFixed(1)} pp |`,
    `| Static SSR create + resolve + render (CPU) | ${duration(offCpu.value)} | ${duration(onCpu.value)} | ${mark(cpuPct, cpuMeaningful)} ${signed(cpuPct, '%')} ±${cpuCi.toFixed(1)} pp |`,
    `| Transient heap growth / render | ${(offAlloc.value / 1024).toFixed(1)} KiB | ${(onAlloc.value / 1024).toFixed(1)} KiB | ${mark(allocDelta, allocMeaningful)} ${allocMeaningful ? `${signed(allocPct, '%')} (95% upper ${signed(allocComparison.pairedCi95UpperPct || 0, '%')})` : `${signed(allocPct, '%')} (within noise gate)`} |`,
    `| Client benchmark bundle (gzip) | ${clientOffBundle.gzippedSize.toLocaleString()} B | ${clientOnBundle.gzippedSize.toLocaleString()} B | ${mark(clientGzipDelta)} ${clientGzipDelta > 0 ? '+' : ''}${clientGzipDelta} B (${signed(pct(clientOffBundle.gzippedSize, clientOnBundle.gzippedSize), '%')}) |`,
    `| Client mount + dispose (CPU) | ${duration(clientOffCpu.value)} | ${duration(clientOnCpu.value)} | ${mark(clientCpuComparison.deltaPct, clientCpuMeaningful)} ${signed(clientCpuComparison.deltaPct, '%')} ±${clientCpuCi.toFixed(1)} pp |`,
    `| Client transient heap / mount + dispose | ${(clientOffAlloc.value / 1024).toFixed(1)} KiB | ${(clientOnAlloc.value / 1024).toFixed(1)} KiB | ${mark(clientAllocDelta, clientAllocMeaningful)} ${clientAllocMeaningful ? `${signed(clientAllocPct, '%')} (95% upper ${signed(clientAllocComparison.pairedCi95UpperPct || 0, '%')})` : `${signed(clientAllocPct, '%')} (within noise gate)`} |`,
    '',
    '<details><summary>Phase detail</summary>',
    '',
    '| CPU stage | Disabled | Enabled | Paired Δ (95% CI) |',
    '|---|---:|---:|---:|',
    `| Create + collect | ${duration(offCreate.value)} | ${duration(onCreate.value)} | ${signed(createComparison.deltaPct, '%')} ±${(createComparison.pairedCi95Pct || 0).toFixed(1)} pp |`,
    `| Create + collect + resolve + render | ${duration(offCpu.value)} | ${duration(onCpu.value)} | ${signed(cpuPct, '%')} ±${cpuCi.toFixed(1)} pp |`,
    '',
    '</details>',
    '',
    `<sub>Server raw: ${offBundle.size.toLocaleString()} B → ${onBundle.size.toLocaleString()} B · Brotli: ${offBundle.brotliSize.toLocaleString()} B → ${onBundle.brotliSize.toLocaleString()} B · CPU RME: ±${(offCpu.rme || 0).toFixed(1)}% / ±${(onCpu.rme || 0).toFixed(1)}%</sub>`,
    '',
    `<sub>Client raw: ${clientOffBundle.size.toLocaleString()} B → ${clientOnBundle.size.toLocaleString()} B · Brotli: ${clientOffBundle.brotliSize.toLocaleString()} B → ${clientOnBundle.brotliSize.toLocaleString()} B · CPU RME: ±${(clientOffCpu.rme || 0).toFixed(1)}% / ±${(clientOnCpu.rme || 0).toFixed(1)}%</sub>`,
  ]
  return out.join('\n')
}
