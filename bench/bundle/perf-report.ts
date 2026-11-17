// Renders separate directional CPU and memory sections. A change is surfaced past a gate:
//  - time:  |Δ| > max(5%, 2× combined relative margin of error). Wall/CPU time is
//           noisy on shared runners, so the gate is RME-bound; small gains stay hidden.
//  - alloc: |Δ| > max(2%, 1 KiB). Synchronous bytes allocated per render is
//           near-deterministic, so a tight gate surfaces gains time can't show.
//  - count: |Δ| > max(2%, 0.5). DOM mutations or detached elements; deterministic,
//           so a half-op change is real (a renderer touching more of the DOM).
//  - memory: compare byte deltas with byte uncertainty, including near-zero results.
// Noisy metrics are `informational`: shown for reference but excluded from the verdict.
// This includes wall time and async heap deltas, where GC/scheduling can false-alarm.

type Category = 'cpu' | 'memory'

interface Measurement {
  id: string
  name: string
  value: number
  rme?: number
  runs?: number
  // reported for reference but excluded from the verdict (e.g. wall time or async allocation)
  informational?: boolean
}

export type PerfBench = Measurement & (
  | { kind: 'time' | 'alloc' | 'memory' }
  | { kind: 'count', category: Category }
)

export interface PerfRun {
  benches: PerfBench[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseVitestBenchmark(value: unknown): PerfBench {
  if (
    !isRecord(value)
    || typeof value.name !== 'string'
    || !isRecord(value.latency)
    || typeof value.latency.mean !== 'number'
    || !Number.isFinite(value.latency.mean)
    || typeof value.latency.rme !== 'number'
    || !Number.isFinite(value.latency.rme)
  ) {
    throw new TypeError('Invalid Vitest benchmark result')
  }

  return {
    id: `bundler-transform:${value.name}`,
    name: `Bundler: ${value.name}`,
    kind: 'time',
    value: value.latency.mean,
    rme: value.latency.rme,
  }
}

export function parseVitestBenchmarks(value: unknown): PerfRun {
  if (value === null || value === undefined)
    return { benches: [] }

  if (!isRecord(value) || !Array.isArray(value.testResults))
    throw new TypeError('Invalid Vitest benchmark output')

  const benches = value.testResults.flatMap((file) => {
    if (!isRecord(file) || !Array.isArray(file.assertionResults))
      throw new TypeError('Invalid Vitest benchmark file')
    return file.assertionResults.flatMap((test) => {
      if (!isRecord(test) || !Array.isArray(test.benchmarks))
        throw new TypeError('Invalid Vitest benchmark test')
      return test.benchmarks.flatMap((group) => {
        if (!isRecord(group) || !Array.isArray(group.tasks))
          throw new TypeError('Invalid Vitest benchmark group')
        return group.tasks.map(parseVitestBenchmark)
      })
    })
  })

  if (!benches.length)
    throw new TypeError('Vitest benchmark output contained no results')

  return { benches }
}

const TIME_FLOOR_PCT = 5
const ALLOC_FLOOR_PCT = 2
const ALLOC_FLOOR_BYTES = 1024
const COUNT_FLOOR_PCT = 2
const COUNT_FLOOR_UNITS = 0.5

type Status = 'new' | 'slower' | 'faster' | 'same'

type Row = {
  bench: PerfBench
  deltaPct: number
} & (
  | { status: 'new', base?: undefined }
  | { status: Exclude<Status, 'new'>, base: PerfBench }
)

function fmtValue(b: PerfBench): string {
  if (b.kind === 'time')
    return `${b.value.toFixed(3)} ms`
  if (b.kind === 'count') {
    const precision = b.informational ? 1000 : 10
    return `${Math.round(b.value * precision) / precision}`
  }
  return fmtBytes(b.value)
}

function fmtBytes(bytes: number): string {
  if (Math.abs(bytes) >= 1024 ** 2)
    return `${Math.round(bytes / 1024 ** 2 * 100) / 100} MiB`
  return `${Math.round((bytes / 1024) * 10) / 10} KiB`
}

function fmtPct(pct: number): string {
  return `${pct > 0 ? '+' : '-'}${Math.abs(pct).toFixed(1)}%`
}

function classify(pr: PerfBench, base?: PerfBench): Row {
  if (!base)
    return { bench: pr, base, status: 'new', deltaPct: 0 }
  const delta = pr.value - base.value
  const deltaPct = base.value !== 0 ? (delta / Math.abs(base.value)) * 100 : 0
  let significant: boolean
  if (pr.kind === 'time') {
    const threshold = Math.max(TIME_FLOOR_PCT, 2 * ((base.rme || 0) + (pr.rme || 0)))
    significant = Math.abs(deltaPct) > threshold
  }
  else if (pr.kind === 'count') {
    // a zero baseline (0 -> N) has no meaningful percentage; fall back to the absolute floor
    significant = pr.informational
      ? delta !== 0
      : Math.abs(delta) > COUNT_FLOOR_UNITS && (base.value === 0 || Math.abs(deltaPct) > COUNT_FLOOR_PCT)
  }
  else if (pr.kind === 'memory') {
    // A near-zero heap delta can have a large RME but little absolute uncertainty.
    const uncertainty = 2 * (Math.abs(base.value) * (base.rme || 0) + Math.abs(pr.value) * (pr.rme || 0)) / 100
    significant = Math.abs(delta) > Math.max(ALLOC_FLOOR_BYTES, Math.abs(base.value) * ALLOC_FLOOR_PCT / 100, uncertainty)
  }
  else {
    const threshold = Math.max(ALLOC_FLOOR_PCT, 2 * ((base.rme || 0) + (pr.rme || 0)))
    significant = Math.abs(delta) > ALLOC_FLOOR_BYTES && (base.value === 0 || Math.abs(deltaPct) > threshold)
  }
  if (!significant)
    return { bench: pr, base, status: 'same', deltaPct }
  // Higher is worse for time, allocated bytes, retained heap and detached elements.
  return { bench: pr, base, status: delta > 0 ? 'slower' : 'faster', deltaPct }
}

function deltaCell(row: Row): string {
  if (row.status === 'new')
    return '🆕 new'
  // informational metrics report their delta neutrally, never as slower/faster
  if (row.bench.informational) {
    if (row.status === 'same')
      return '~ noise'
    if (row.bench.kind === 'count' || row.base?.value === 0) {
      const delta = row.bench.value - row.base.value
      return `ℹ️ ${delta > 0 ? '+' : ''}${fmtValue({ ...row.bench, value: delta })}`
    }
    return `ℹ️ ${fmtPct(row.deltaPct)}`
  }
  if (row.status === 'same')
    return '~ noise'
  const emoji = row.status === 'slower' ? '🔴' : '🟢'
  if (row.bench.kind === 'time')
    return `${emoji} ${fmtPct(row.deltaPct)}`
  const delta = row.bench.value - (row.base?.value ?? 0)
  const percentage = row.base?.value === 0 ? '' : ` (${fmtPct(row.deltaPct)})`
  if (row.bench.kind === 'count')
    return `${emoji} ${delta > 0 ? '+' : ''}${Math.round(delta * 10) / 10}${percentage}`
  return `${emoji} ${delta > 0 ? '+' : '-'}${fmtBytes(Math.abs(delta))}${percentage}`
}

function renderSection(category: Category, rows: Row[]): string {
  if (!rows.length)
    return ''

  // informational benches are shown in the details but never drive the verdict
  const changed = rows.filter(r => !r.bench.informational && (r.status === 'slower' || r.status === 'faster'))
  const observedWork = rows.filter(r => r.bench.informational && r.bench.kind === 'count' && (r.status === 'slower' || r.status === 'faster'))
  const highlighted = rows.filter(r => (r.status === 'slower' || r.status === 'faster') && (!r.bench.informational || r.bench.kind === 'count'))
  const slower = changed.filter(r => r.status === 'slower')

  const out: string[] = [`### ⚡ Perf - ${category === 'cpu' ? 'CPU' : 'Memory'}`, '']
  if (slower.length)
    out.push(`⚠️ **${slower.length} ${category === 'cpu' ? 'slower' : 'higher'}**`)
  else if (changed.length)
    out.push(`🟢 **${changed.length} ${category === 'cpu' ? 'faster' : 'lower'}**`)
  else if (category === 'cpu' && observedWork.length)
    out.push('✅ **No significant timing change**')
  else
    out.push('✅ **No significant change**')

  if (highlighted.length) {
    out.push('', '| Benchmark | base → PR | Δ |', '|---|---|---|')
    for (const row of highlighted)
      out.push(`| **${row.bench.name}** | ${fmtValue(row.base!)} → ${fmtValue(row.bench)} | ${deltaCell(row)} |`)
  }

  out.push('', `<details><summary>All benchmarks (${rows.length})</summary>`, '')
  out.push('| Benchmark | Base | PR | Δ | RME |', '|---|---|---|---|---|')
  for (const row of rows) {
    const rme = row.bench.rme != null ? `±${row.bench.rme.toFixed(1)}%` : '—'
    out.push(`| ${row.bench.name} | ${row.base ? fmtValue(row.base) : '—'} | ${fmtValue(row.bench)} | ${deltaCell(row)} | ${rme} |`)
  }
  if (category === 'cpu')
    out.push('', 'Timing results are directional measurements from a shared CI runner.')
  if (rows.some(row => row.bench.kind === 'count' && row.bench.informational))
    out.push('', 'DOM read counts use a separate untimed run.')
  if (rows.some(row => row.bench.kind === 'alloc'))
    out.push('', 'Allocation rows show bytes allocated per operation.')
  if (rows.some(row => row.bench.kind === 'memory')) {
    out.push('', 'Process memory measurements run after forced GC. Retained heap is the change across the full batch.', 'RSS includes runtime overhead. External memory covers native allocations associated with JavaScript objects.', 'CSR measurements include jsdom overhead.')
  }
  out.push('', '</details>')

  return out.join('\n')
}

export function renderPerfReport(base: PerfRun | null, pr: PerfRun): string {
  const sections: Record<Category, Row[]> = { cpu: [], memory: [] }
  for (const bench of pr.benches) {
    const category = bench.kind === 'count' ? bench.category : bench.kind === 'time' ? 'cpu' : 'memory'
    sections[category].push(classify(bench, base?.benches.find(candidate => candidate.id === bench.id)))
  }
  return [renderSection('cpu', sections.cpu), renderSection('memory', sections.memory)]
    .filter(Boolean)
    .join('\n\n---\n\n')
}
