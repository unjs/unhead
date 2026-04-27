import type { Diagnostic, TagPredicate } from './types'

export const preloadMissingAs: TagPredicate = (tag) => {
  if (tag.tagType !== 'link')
    return []
  if (tag.props.rel !== 'preload')
    return []
  if (tag.keys.has('as'))
    return []
  const diag: Diagnostic = {
    ruleId: 'preload-missing-as',
    message: 'Preload link is missing the required "as" attribute.',
  }
  return [diag]
}

export const preloadFontCrossorigin: TagPredicate = (tag) => {
  if (tag.tagType !== 'link')
    return []
  if (tag.props.rel !== 'preload')
    return []
  if (tag.props.as !== 'font')
    return []
  if (tag.keys.has('crossorigin'))
    return []
  const diag: Diagnostic = {
    ruleId: 'preload-font-crossorigin',
    message: 'Font preload requires "crossorigin" — without it the font will be fetched twice.',
    fix: { type: 'insert-after-prop', afterKey: 'as', insert: `, crossorigin: 'anonymous'` },
  }
  return [diag]
}
