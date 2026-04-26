import type { Diagnostic, TagPredicate } from './types'

export const robotsConflict: TagPredicate = (tag) => {
  if (tag.tagType !== 'meta')
    return []
  if (tag.props.name !== 'robots')
    return []
  const content = tag.props.content
  if (typeof content !== 'string')
    return []
  const directives = content.toLowerCase().split(',').map(d => d.trim())
  const out: Diagnostic[] = []
  if (directives.includes('index') && directives.includes('noindex')) {
    out.push({
      ruleId: 'robots-conflict',
      message: 'Robots meta has conflicting "index" and "noindex" directives.',
    })
  }
  if (directives.includes('follow') && directives.includes('nofollow')) {
    out.push({
      ruleId: 'robots-conflict',
      message: 'Robots meta has conflicting "follow" and "nofollow" directives.',
    })
  }
  return out
}
