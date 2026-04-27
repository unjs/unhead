import type { Diagnostic, TagPredicate } from './types'
import { KNOWN_META_NAMES, KNOWN_META_PROPERTIES } from '../known'
import { findClosestMatch } from '../levenshtein'

const OG_PREFIX_RE = /^(?:og|article|book|profile|fb):/

export const noUnknownMeta: TagPredicate = (tag) => {
  if (tag.tagType !== 'meta')
    return []
  const out: Diagnostic[] = []

  const property = tag.props.property
  if (typeof property === 'string' && !KNOWN_META_PROPERTIES.has(property) && OG_PREFIX_RE.test(property)) {
    const suggestion = findClosestMatch(property, KNOWN_META_PROPERTIES)
    if (suggestion) {
      out.push({
        ruleId: 'possible-typo',
        message: `Unknown meta property "${property}". Did you mean "${suggestion}"?`,
        at: { kind: 'prop-value', key: 'property' },
        fix: { type: 'replace-prop-value', key: 'property', newSource: `'${suggestion}'` },
      })
    }
  }

  const name = tag.props.name
  if (typeof name === 'string') {
    // HTML `meta[name]` is case-insensitive; normalise before lookup.
    const lower = name.toLowerCase()
    if (
      !KNOWN_META_NAMES.has(lower)
      && (lower.startsWith('twitter:') || lower.startsWith('fediverse:') || !lower.includes(':'))
    ) {
      const suggestion = findClosestMatch(lower, KNOWN_META_NAMES)
      if (suggestion) {
        out.push({
          ruleId: 'possible-typo',
          message: `Unknown meta name "${name}". Did you mean "${suggestion}"?`,
          at: { kind: 'prop-value', key: 'name' },
          fix: { type: 'replace-prop-value', key: 'name', newSource: `'${suggestion}'` },
        })
      }
    }
  }

  return out
}
