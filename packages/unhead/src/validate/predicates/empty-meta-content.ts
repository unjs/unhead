import type { Diagnostic, TagPredicate } from './types'

export const emptyMetaContent: TagPredicate = (tag) => {
  if (tag.tagType !== 'meta')
    return []
  if (!tag.keys.has('content'))
    return []
  if (tag.props.content !== '')
    return []
  const key = (typeof tag.props.name === 'string' && tag.props.name)
    || (typeof tag.props.property === 'string' && tag.props.property)
    || 'meta'
  const diag: Diagnostic = {
    ruleId: 'empty-meta-content',
    message: `Meta tag "${key}" has empty content.`,
    at: { kind: 'prop', key: 'content' },
  }
  return [diag]
}
