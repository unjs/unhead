import type { Diagnostic, HeadInputPredicate } from './types'

const HTML_CHARS_RE = /[<>]/

export const noHtmlInTitle: HeadInputPredicate = (input) => {
  const title = input.props.title
  if (typeof title !== 'string' || !HTML_CHARS_RE.test(title))
    return []
  const diag: Diagnostic = {
    ruleId: 'html-in-title',
    message: `Title contains HTML characters which will be escaped, not rendered: "${title}".`,
    at: { kind: 'prop-value', key: 'title' },
  }
  return [diag]
}
