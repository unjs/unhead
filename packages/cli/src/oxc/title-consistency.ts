import type { AuditFileResult, TitleObservation } from './audit'

export interface TitleFinding {
  kind: 'separator' | 'common-suffix' | 'redundant-suffix' | 'literal-mixed-with-template'
  /** Headline rendered in the report. */
  message: string
  /** Educational follow-up — usually the unhead pattern that fixes it. */
  hint: string
  /** Sample file paths (subset) that exhibit the issue, with location. */
  occurrences: { filePath: string, line: number, column: number, value: string }[]
}

interface ObservationWithFile extends TitleObservation {
  filePath: string
}

/**
 * Common visual separators we expect to see between page name and site name
 * in <title> values. The list is intentionally narrow — adding obscure ones
 * (e.g. middle dot variants) would inflate the inconsistency count without
 * giving users a real signal.
 */
const SEPARATORS = [' | ', ' - ', ' – ', ' — ', ' · ', ' :: ', ' / ']

const TEMPLATE_PARAM_RE = /%[a-z][a-z0-9]*/i

function flatten(results: AuditFileResult[]): { titles: ObservationWithFile[], templates: ObservationWithFile[] } {
  const titles: ObservationWithFile[] = []
  const templates: ObservationWithFile[] = []
  for (const r of results) {
    for (const t of r.titles) titles.push({ ...t, filePath: r.filePath })
    for (const t of r.titleTemplates) templates.push({ ...t, filePath: r.filePath })
  }
  return { titles, templates }
}

function detectSeparator(value: string): string | undefined {
  // Pick the separator with the most occurrences; ties → first in SEPARATORS order.
  let best: { sep: string, count: number } | undefined
  for (const sep of SEPARATORS) {
    const count = value.split(sep).length - 1
    if (count > 0 && (!best || count > best.count))
      best = { sep, count }
  }
  return best?.sep
}

function suffixAfterSeparator(value: string, sep: string): string {
  const parts = value.split(sep)
  return parts[parts.length - 1].trim()
}

/**
 * Analyse all collected title literals and emit project-wide consistency
 * findings. Each finding pairs a problem statement with an actionable hint
 * pointing at unhead's templateParams / titleTemplate APIs.
 */
export function analyzeTitleConsistency(results: AuditFileResult[]): TitleFinding[] {
  const { titles, templates } = flatten(results)
  if (titles.length < 2)
    return []

  const findings: TitleFinding[] = []

  // 1. Mixed separators across the project.
  const sepBuckets = new Map<string, ObservationWithFile[]>()
  for (const t of titles) {
    const sep = detectSeparator(t.value)
    if (!sep)
      continue
    const arr = sepBuckets.get(sep) ?? []
    arr.push(t)
    sepBuckets.set(sep, arr)
  }
  if (sepBuckets.size > 1) {
    const breakdown = Array.from(sepBuckets.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([sep, occ]) => `"${sep.trim()}" (${occ.length})`)
      .join(', ')
    const occurrences: TitleFinding['occurrences'] = []
    for (const [, occ] of sepBuckets) {
      for (const o of occ.slice(0, 3))
        occurrences.push({ filePath: o.filePath, line: o.line, column: o.column, value: o.value })
    }
    findings.push({
      kind: 'separator',
      message: `${sepBuckets.size} different title separators in use across pages: ${breakdown}.`,
      hint: 'Set `templateParams: { separator: "·" }` and a single `titleTemplate: "%s %separator %siteName"` in `nuxt.config.app.head` so every page renders with the same separator without repeating it.',
      occurrences,
    })
  }

  // 2. Common suffix shared by most titles → titleTemplate candidate.
  const trailingCounts = new Map<string, ObservationWithFile[]>()
  for (const t of titles) {
    const sep = detectSeparator(t.value)
    if (!sep)
      continue
    const tail = suffixAfterSeparator(t.value, sep)
    if (!tail || TEMPLATE_PARAM_RE.test(tail))
      continue
    const arr = trailingCounts.get(tail) ?? []
    arr.push(t)
    trailingCounts.set(tail, arr)
  }
  let bestSuffix: { tail: string, occ: ObservationWithFile[] } | undefined
  for (const [tail, occ] of trailingCounts) {
    if (occ.length < 3)
      continue
    if (!bestSuffix || occ.length > bestSuffix.occ.length)
      bestSuffix = { tail, occ }
  }
  if (bestSuffix && bestSuffix.occ.length >= Math.max(3, Math.ceil(titles.length * 0.5))) {
    const templateSet = templates.length > 0
    const suffix = bestSuffix.tail
    const hint = templateSet
      ? `\`titleTemplate\` is already set in this project — these pages duplicate "${suffix}" and will likely render it twice. Drop the suffix from each \`title:\` value.`
      : `Set \`titleTemplate: "%s %separator %siteName"\` and \`templateParams: { siteName: "${suffix}" }\` in \`nuxt.config.app.head\`, then drop the trailing " … ${suffix}" from every page \`title\`.`
    findings.push({
      kind: templateSet ? 'redundant-suffix' : 'common-suffix',
      message: `${bestSuffix.occ.length} of ${titles.length} page titles end with " … ${suffix}".`,
      hint,
      occurrences: bestSuffix.occ.slice(0, 5).map(o => ({ filePath: o.filePath, line: o.line, column: o.column, value: o.value })),
    })
  }

  // 3. Mix of literal titles and titles already using template params.
  const usingParams = titles.filter(t => TEMPLATE_PARAM_RE.test(t.value))
  if (usingParams.length > 0 && usingParams.length < titles.length) {
    const literal = titles.filter(t => !TEMPLATE_PARAM_RE.test(t.value))
    findings.push({
      kind: 'literal-mixed-with-template',
      message: `${usingParams.length} of ${titles.length} page titles use template params (e.g. %siteName) and ${literal.length} use literal strings.`,
      hint: 'Pick one approach: either move shared parts into `titleTemplate` + `templateParams` and have pages set just their unique segment, or drop template params everywhere. Mixing them makes the rendered output unpredictable.',
      occurrences: literal.slice(0, 5).map(o => ({ filePath: o.filePath, line: o.line, column: o.column, value: o.value })),
    })
  }

  return findings
}
