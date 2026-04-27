import type { Diagnostic, TagPredicate } from './types'

function isAbsolute(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

export const nonAbsoluteCanonical: TagPredicate = (tag) => {
  if (tag.tagType !== 'link')
    return []
  if (tag.props.rel !== 'canonical')
    return []
  const href = tag.props.href
  if (typeof href !== 'string')
    return []
  if (isAbsolute(href))
    return []
  const diag: Diagnostic = {
    ruleId: 'non-absolute-canonical',
    message: `Canonical URL should be absolute, received "${href}".`,
    at: { kind: 'prop-value', key: 'href' },
  }
  return [diag]
}
