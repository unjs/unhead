import type { PreparedHtmlTemplate } from '../../parser/parser'
import { parseHtmlForUnheadExtraction } from '../../parser/parser'

/* @__PURE__ */
export function extractUnheadInputFromHtml(html: string): PreparedHtmlTemplate {
  return parseHtmlForUnheadExtraction(html)
}
