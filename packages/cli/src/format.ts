import type { AuditFileResult } from './oxc/audit'
import { relative } from 'pathe'

const RED = '\x1B[31m'
const YELLOW = '\x1B[33m'
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
    ? { red: RED, yellow: YELLOW, dim: DIM, reset: RESET, bold: BOLD }
    : { red: '', yellow: '', dim: '', reset: '', bold: '' }

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

  if (total === 0)
    return ''

  lines.push('')
  const summary = `${total} problem${total === 1 ? '' : 's'} (${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'})`
  lines.push(`${errors > 0 ? c.red : c.yellow}${c.bold}✖ ${summary}${c.reset}`)
  return `${lines.join('\n')}\n`
}
