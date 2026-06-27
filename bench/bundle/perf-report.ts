// Renders the directional Performance section. CI noise on shared runners is real,
// so a change is only surfaced when it clears a gate:
//  - time:   |Δ| > max(10%, 2× combined relative margin of error)
//  - memory: |Δ| > 512 KiB retained (a percentage gate is meaningless here because
//            retained heap hovers around zero; only a genuine leak clears 512 KiB)

export interface PerfBench {
  id: string
  name: string
  kind: 'time' | 'memory'
  value: number
  rme?: number
  runs?: number
}

export interface PerfRun {
  benches: PerfBench[]
}

const TIME_FLOOR_PCT = 10
const MEM_FLOOR_BYTES = 512 * 1024

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
    significant = Math.abs(delta) > MEM_FLOOR_BYTES
  }
  if (!significant)
    return { bench: pr, base, status: 'same', deltaPct }
  // higher is worse for both wall-time and retained heap
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
  const deltaKib = Math.round(((row.bench.value - (row.base?.value ?? 0)) / 1024) * 10) / 10
  return `${emoji} ${deltaKib > 0 ? '+' : ''}${deltaKib} KiB`
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
