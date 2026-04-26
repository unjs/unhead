import type { AuditFileResult } from './oxc/audit'
import { relative } from 'pathe'
import { analyzeTitleConsistency } from './oxc/title-consistency'

const RED = '\x1B[31m'
const YELLOW = '\x1B[33m'
const GREEN = '\x1B[32m'
const CYAN = '\x1B[36m'
const DIM = '\x1B[90m'
const RESET = '\x1B[0m'
const BOLD = '\x1B[1m'

/**
 * Stylish-ish formatter for audit results, modeled loosely on ESLint's
 * `stylish` formatter. Output is colourised with ANSI when stdout is a TTY.
 */
export function formatStylish(results: AuditFileResult[], cwd: string, color: boolean): string {
  const titleFindings = analyzeTitleConsistency(results)
  if (results.length === 0 && titleFindings.length === 0)
    return ''

  const c = color
    ? { red: RED, yellow: YELLOW, green: GREEN, cyan: CYAN, dim: DIM, reset: RESET, bold: BOLD }
    : { red: '', yellow: '', green: '', cyan: '', dim: '', reset: '', bold: '' }

  const lines: string[] = []
  let total = 0
  let errors = 0
  let warnings = 0
  let infos = 0

  const sevColor: Record<string, string> = { error: c.red, warning: c.yellow, info: c.cyan }

  for (const r of results) {
    if (r.diagnostics.length === 0)
      continue
    lines.push('')
    lines.push(`${c.bold}${relative(cwd, r.filePath)}${c.reset}`)

    const padLineCol = r.diagnostics.reduce((n, d) => Math.max(n, `${d.line}:${d.column}`.length), 0)
    const padSeverity = r.diagnostics.reduce((n, d) => Math.max(n, d.severity.length), 0)

    for (const d of r.diagnostics) {
      total++
      if (d.severity === 'error')
        errors++
      else if (d.severity === 'warning')
        warnings++
      else
        infos++
      const lc = `${d.line}:${d.column}`.padEnd(padLineCol)
      const sev = d.severity.padEnd(padSeverity)
      lines.push(`  ${c.dim}${lc}${c.reset}  ${sevColor[d.severity]}${sev}${c.reset}  ${d.message}  ${c.dim}${d.ruleId}${c.reset}`)
    }
  }

  const covered = results.filter(r => r.diagnostics.length === 0 && r.headCalls.length > 0)
  if (covered.length > 0) {
    lines.push('')
    lines.push(`${c.dim}Scanned ${covered.length} file${covered.length === 1 ? '' : 's'} with head usage and no issues:${c.reset}`)
    const padPath = covered.reduce((n, r) => Math.max(n, relative(cwd, r.filePath).length), 0)
    for (const r of covered) {
      const path = relative(cwd, r.filePath).padEnd(padPath)
      const counts = summariseCalls(r.headCalls)
      lines.push(`  ${c.green}✓${c.reset} ${path}  ${c.dim}${counts}${c.reset}`)
    }
  }

  if (titleFindings.length > 0) {
    lines.push('')
    lines.push(`${c.bold}Title consistency${c.reset}`)
    for (const f of titleFindings) {
      lines.push(`  ${c.yellow}⚠${c.reset} ${f.message}`)
      lines.push(`    ${c.dim}→ ${f.hint}${c.reset}`)
      for (const o of f.occurrences) {
        const path = relative(cwd, o.filePath)
        lines.push(`    ${c.dim}${path}:${o.line}${c.reset}  ${truncate(o.value, 80)}`)
      }
    }
  }

  if (total === 0 && covered.length === 0 && titleFindings.length === 0)
    return ''

  if (total > 0) {
    lines.push('')
    const parts = [`${errors} error${errors === 1 ? '' : 's'}`, `${warnings} warning${warnings === 1 ? '' : 's'}`]
    if (infos > 0)
      parts.push(`${infos} info`)
    const summary = `${total} problem${total === 1 ? '' : 's'} (${parts.join(', ')})`
    const summaryColor = errors > 0 ? c.red : warnings > 0 ? c.yellow : c.cyan
    const glyph = errors > 0 || warnings > 0 ? '✖' : 'ℹ'
    lines.push(`${summaryColor}${c.bold}${glyph} ${summary}${c.reset}`)
  }
  return `${lines.join('\n')}\n`
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`
}

function summariseCalls(calls: AuditFileResult['headCalls']): string {
  const counts = new Map<string, number>()
  for (const call of calls)
    counts.set(call.name, (counts.get(call.name) ?? 0) + 1)
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, n]) => n === 1 ? name : `${name} ×${n}`)
    .join(', ')
}
