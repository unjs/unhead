import type { PreparedHtmlTemplate } from '../../parser'
import { parseHtmlForUnheadExtraction } from '../../parser'

/**
 * @deprecated use `parseHtmlForUnheadExtraction` from `unhead/parser` instead
 * @param html
 */
/* @__PURE__ */
export function extractUnheadInputFromHtml(html: string): PreparedHtmlTemplate {
  return parseHtmlForUnheadExtraction(html)
}
