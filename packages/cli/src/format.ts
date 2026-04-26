import type { AuditFileResult } from './oxc/audit'
import { relative } from 'pathe'

const RED = '\x1B[31m'
const YELLOW = '\x1B[33m'
const GREEN = '\x1B[32m'
const DIM = '\x1B[90m'
const RESET = '\x1B[0m'
const BOLD = '\x1B[1m'

/**
 * Stylish-ish formatter for audit results, modeled loosely on ESLint's
 * `stylish` formatter. Output is colourised with ANSI when stdout is a TTY.
 */
export function formatStylish(results: AuditFileResult[], cwd: string, color: boolean): string {
  if (results.length === 0)
    return ''

  const c = color
    ? { red: RED, yellow: YELLOW, green: GREEN, dim: DIM, reset: RESET, bold: BOLD }
    : { red: '', yellow: '', green: '', dim: '', reset: '', bold: '' }

  const lines: string[] = []
  let total = 0
  let errors = 0
  let warnings = 0

  for (const r of results) {
    if (r.diagnostics.length === 0)
      continue
    lines.push('')
    lines.push(`${c.bold}${relative(cwd, r.filePath)}${c.reset}`)

    const padLineCol = r.diagnostics.reduce((n, d) => Math.max(n, `${d.line}:${d.column}`.length), 0)
    const padSeverity = r.diagnostics.some(d => d.severity === 'warning') ? 7 : 5

    for (const d of r.diagnostics) {
      total++
      if (d.severity === 'error')
        errors++
      else
        warnings++
      const lc = `${d.line}:${d.column}`.padEnd(padLineCol)
      const sev = d.severity.padEnd(padSeverity)
      const sevColor = d.severity === 'error' ? c.red : c.yellow
      lines.push(`  ${c.dim}${lc}${c.reset}  ${sevColor}${sev}${c.reset}  ${d.message}  ${c.dim}${d.ruleId}${c.reset}`)
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

  if (total === 0 && covered.length === 0)
    return ''

  if (total > 0) {
    lines.push('')
    const summary = `${total} problem${total === 1 ? '' : 's'} (${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'})`
    lines.push(`${errors > 0 ? c.red : c.yellow}${c.bold}✖ ${summary}${c.reset}`)
  }
  return `${lines.join('\n')}\n`
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
