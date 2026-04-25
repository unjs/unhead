import type { HeadValidationRule } from 'unhead/plugins'
import { parseHtmlForUnheadExtraction } from 'unhead/parser'
import { ValidatePlugin } from 'unhead/plugins'
import { createHead, renderSSRHead } from 'unhead/server'

export interface ValidationOutput {
  source: string
  rules: HeadValidationRule[]
}

/**
 * Run the runtime ValidatePlugin over a raw HTML document, returning the
 * captured rule violations. Used by both `validate-url` and `validate-html`.
 */
export function validateHtml(html: string, source: string): ValidationOutput {
  const { input } = parseHtmlForUnheadExtraction(html)
  const captured: HeadValidationRule[] = []
  const head = createHead({
    plugins: [ValidatePlugin({ onReport: rs => captured.push(...rs) })],
  })
  head.push(input)
  renderSSRHead(head)
  return { source, rules: captured }
}

export function severitySymbol(severity: HeadValidationRule['severity']): string {
  return severity === 'warn' ? '⚠' : 'ℹ'
}

export function printReport({ source, rules }: ValidationOutput): void {
  if (rules.length === 0) {
    console.log(`${source} — no issues found`)
    return
  }
  console.log(`\n${source}`)
  for (const rule of rules)
    console.log(`  ${severitySymbol(rule.severity)} ${rule.id}: ${rule.message}`)
  const warnings = rules.filter(r => r.severity === 'warn').length
  const info = rules.filter(r => r.severity === 'info').length
  console.log(`\n  ${rules.length} issue${rules.length === 1 ? '' : 's'} (${warnings} warning, ${info} info)`)
}

/**
 * JSON.stringify replacer that drops the bulky `tag` field from each rule.
 */
export function jsonReplacer(key: string, value: unknown): unknown {
  return key === 'tag' ? undefined : value
}
