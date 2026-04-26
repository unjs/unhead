import type { Diagnostic, TagPredicate } from './types'

const ALIASES = ['critical', 'high', 'low'] as const

export const numericTagPriority: TagPredicate = (tag) => {
  const value = tag.props.tagPriority
  if (typeof value !== 'number')
    return []
  const diag: Diagnostic = {
    ruleId: 'numeric-tag-priority',
    message: `Numeric tagPriority (${value}) is brittle. Prefer an alias ('critical' | 'high' | 'low') or 'before:<key>' / 'after:<key>'.`,
    at: { kind: 'prop-value', key: 'tagPriority' },
    suggestions: ALIASES.map(alias => ({
      message: `Replace with '${alias}'`,
      fix: { type: 'replace-prop-value', key: 'tagPriority', newSource: `'${alias}'` },
    })),
  }
  return [diag]
}
