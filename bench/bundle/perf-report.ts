// Renders the directional Performance section. A change is only surfaced past a gate:
//  - time:  |Δ| > max(5%, 2× combined relative margin of error). Wall/CPU time is
//           noisy on shared runners, so the gate is RME-bound; small gains stay hidden.
//  - alloc: |Δ| > max(2%, 1 KiB). Bytes allocated per render is near-deterministic
//           (~0 noise), so a tight gate surfaces the marginal gains time can't show.

export interface PerfBench {
  id: string
  name: string
  kind: 'time' | 'alloc'
  value: number
  rme?: number
  runs?: number
}

export interface PerfRun {
  benches: PerfBench[]
}

const TIME_FLOOR_PCT = 5
const ALLOC_FLOOR_PCT = 2
const ALLOC_FLOOR_BYTES = 1024

type Status = 'new' | 'slower' | 'faster' | 'same'

interface Row {
  bench: PerfBench
  base?: PerfBench
  status: Status
  deltaPct: number
}

function fmtValue(b: PerfBench): string {
  if (b.kind === 'time')
    return `${b.value.toFixed(3)} ms`
  const kib = Math.round((b.value / 1024) * 10) / 10
  return `${kib} KiB`
}

function fmtKib(bytes: number): string {
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
  else {
    significant = Math.abs(deltaPct) > ALLOC_FLOOR_PCT && Math.abs(delta) > ALLOC_FLOOR_BYTES
  }
  if (!significant)
    return { bench: pr, base, status: 'same', deltaPct }
  // higher is worse for both time and allocation
  return { bench: pr, base, status: delta > 0 ? 'slower' : 'faster', deltaPct }
}

function deltaCell(row: Row): string {
  if (row.status === 'new')
    return '🆕 new'
  if (row.status === 'same')
    return '~ noise'
  const emoji = row.status === 'slower' ? '🔴' : '🟢'
  if (row.bench.kind === 'time')
    return `${emoji} ${fmtPct(row.deltaPct)}`
  const delta = row.bench.value - (row.base?.value ?? 0)
  return `${emoji} ${delta > 0 ? '+' : '-'}${fmtKib(Math.abs(delta))} (${fmtPct(row.deltaPct)})`
}

export function renderPerfReport(base: PerfRun | null, pr: PerfRun): string {
  const rows = pr.benches.map(b => classify(b, base?.benches?.find(x => x.id === b.id)))
  const changed = rows.filter(r => r.status === 'slower' || r.status === 'faster')
  const slower = changed.filter(r => r.status === 'slower')

  const out: string[] = ['## ⚡ Performance _(directional)_', '']
  if (slower.length)
    out.push(`⚠️ **${slower.length} slower** · gated at \`|Δ| > max(10%, 2×RME)\``)
  else if (changed.length)
    out.push(`🟢 **${changed.length} faster**`)
  else
    out.push('✅ **No significant change** _(within CI noise)_')

  if (changed.length) {
    out.push('', '| Benchmark | base → PR | Δ |', '|---|---|---|')
    for (const row of changed)
      out.push(`| **${row.bench.name}** | ${fmtValue(row.base!)} → ${fmtValue(row.bench)} | ${deltaCell(row)} |`)
  }

  out.push('', `<details><summary>All benchmarks (${rows.length})</summary>`, '')
  out.push('| Benchmark | PR | Δ | RME |', '|---|---|---|---|')
  for (const row of rows) {
    const rme = row.bench.rme != null ? `±${row.bench.rme.toFixed(1)}%` : '—'
    out.push(`| ${row.bench.name} | ${fmtValue(row.bench)} | ${deltaCell(row)} | ${rme} |`)
  }
  out.push('', '</details>')

  return out.join('\n')
}
