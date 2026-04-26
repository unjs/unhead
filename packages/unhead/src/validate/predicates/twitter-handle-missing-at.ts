import type { Diagnostic, TagPredicate } from './types'

const NUMERIC_RE = /^\d+$/

export const twitterHandleMissingAt: TagPredicate = (tag) => {
  if (tag.tagType !== 'meta')
    return []
  const name = tag.props.name
  if (name !== 'twitter:site' && name !== 'twitter:creator')
    return []
  const content = tag.props.content
  if (typeof content !== 'string')
    return []
  if (content.startsWith('@') || NUMERIC_RE.test(content))
    return []
  const diag: Diagnostic = {
    ruleId: 'twitter-handle-missing-at',
    message: `${name} should start with "@", received "${content}".`,
    at: { kind: 'prop-value', key: 'content' },
    fix: { type: 'replace-prop-value', key: 'content', newSource: `'@${content}'` },
  }
  return [diag]
}
