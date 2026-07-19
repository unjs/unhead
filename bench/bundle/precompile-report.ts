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
  const offBundle = bundles.find(item => item.name === 'Precompile Runtime (Off)')
  const onBundle = bundles.find(item => item.name === 'Precompile Runtime (On)')
  if (!offBundle || !onBundle)
    throw new Error('Missing experimental precompile runtime bundle pair.')

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

  const out = [
    '## 🧪 Experimental sealed precompile _(same commit)_',
    '',
    'The same static core SSR source, including package defaults, is bundled and executed in two configurations. Disabled uses the normal runtime; enabled applies `experimental.precompile` and selects the sealed `unhead/precompiled/server` entry. The compiler hoists build-finalized render plans, so the enabled runtime only collects, dedupes/orders, and joins fragments. This compile-or-error mode deliberately excludes dynamic inputs, hooks/plugins, custom weights, observed entry handles, framework adapters, and streaming replay. Ordinary bundles above do not import any sealed runtime code. CPU samples alternate OFF/ON order and consume every result; memory is paired-bootstrap median transient heap growth per complete create + render.',
    '',
    '| Metric | Disabled | Enabled | Δ |',
    '|---|---:|---:|---:|',
    `| Static SSR benchmark bundle (gzip) | ${offBundle.gzippedSize.toLocaleString()} B | ${onBundle.gzippedSize.toLocaleString()} B | ${mark(gzipDelta)} ${gzipDelta > 0 ? '+' : ''}${gzipDelta} B (${signed(pct(offBundle.gzippedSize, onBundle.gzippedSize), '%')}) |`,
    `| Static SSR create + collect (CPU) | ${duration(offCreate.value)} | ${duration(onCreate.value)} | ${mark(createComparison.deltaPct, createCpuMeaningful)} ${signed(createComparison.deltaPct, '%')} ±${createCpuCi.toFixed(1)} pp |`,
    `| Static SSR create + resolve (CPU) | ${duration(offResolve.value)} | ${duration(onResolve.value)} | ${mark(resolveCpuPct, resolveCpuMeaningful)} ${signed(resolveCpuPct, '%')} ±${resolveCpuCi.toFixed(1)} pp |`,
    `| Static SSR create + resolve + render (CPU) | ${duration(offCpu.value)} | ${duration(onCpu.value)} | ${mark(cpuPct, cpuMeaningful)} ${signed(cpuPct, '%')} ±${cpuCi.toFixed(1)} pp |`,
    `| Transient heap growth / render | ${(offAlloc.value / 1024).toFixed(1)} KiB | ${(onAlloc.value / 1024).toFixed(1)} KiB | ${mark(allocDelta, allocMeaningful)} ${allocMeaningful ? `${signed(allocPct, '%')} (95% upper ${signed(allocComparison.pairedCi95UpperPct || 0, '%')})` : `${signed(allocPct, '%')} (within noise gate)`} |`,
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
    `<sub>Raw bundle: ${offBundle.size.toLocaleString()} B → ${onBundle.size.toLocaleString()} B · Brotli: ${offBundle.brotliSize.toLocaleString()} B → ${onBundle.brotliSize.toLocaleString()} B · CPU RME: ±${(offCpu.rme || 0).toFixed(1)}% / ±${(onCpu.rme || 0).toFixed(1)}%</sub>`,
  ]
  return out.join('\n')
}
