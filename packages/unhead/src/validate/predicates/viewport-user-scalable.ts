import type { Diagnostic, TagPredicate } from './types'

// `user-scalable` accepts `no` and `0` (and `false` per WHATWG) — all suppress
// pinch-zoom equivalently. `maximum-scale=1` is anything from 1 up to 1.99…
// (anything below 2 still effectively blocks zoom under WCAG 1.4.4).
const USER_SCALABLE_NO_RE = /user-scalable\s*=\s*(?:no|0|false)(?:[\s,;]|$)/i
const MAX_SCALE_RE = /maximum-scale\s*=\s*1(?:\.\d+)?(?:[\s,;]|$)/i

export const viewportUserScalable: TagPredicate = (tag) => {
  if (tag.tagType !== 'meta')
    return []
  if (tag.props.name !== 'viewport')
    return []
  const content = tag.props.content
  if (typeof content !== 'string')
    return []
  const out: Diagnostic[] = []
  if (USER_SCALABLE_NO_RE.test(content)) {
    out.push({
      ruleId: 'viewport-user-scalable',
      message: 'viewport "user-scalable=no" prevents zooming and harms accessibility.',
    })
  }
  if (MAX_SCALE_RE.test(content)) {
    out.push({
      ruleId: 'viewport-user-scalable',
      message: 'viewport "maximum-scale=1" limits zooming and may harm accessibility.',
    })
  }
  return out
}
