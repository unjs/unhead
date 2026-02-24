import type { SSRHeadPayload, Unhead } from '../types'
import { applyHeadToHtml, parseHtmlForIndexes, parseHtmlForUnheadExtraction } from '../parser'

/**
 * Transform an HTML template string by extracting any head tags and attributes from it, pushing them to Unhead,
 * and injecting the resulting head tags back into the HTML.
 * Uses optimized parsing and index-based HTML construction for best performance.
 */
/* @__NO_SIDE_EFFECTS__ */
export function transformHtmlTemplate(head: Unhead<any, SSRHeadPayload>, html: string) {
  const template = parseHtmlForUnheadExtraction(html)
  head.push(template.input, { _index: 0 })
  return applyHeadToHtml(template, head.render())
}

/**
 * Transform an HTML template string by injecting head tags managed by Unhead.
 *
 * The differs to `transformHtmlTemplate` in that it does not extract and push any head input from the HTML, resulting
 * in much more performant execution if you don't need that feature.
 *
 * However, this also means that any head tags or attributes already present in the HTML may be duplicated or
 * ordered incorrectly, so use with caution.
 */
/* @__NO_SIDE_EFFECTS__ */
export function transformHtmlTemplateRaw(head: Unhead<any, SSRHeadPayload>, html: string) {
  // For raw mode, we only need indexes, not head extraction
  const template = parseHtmlForIndexes(html)
  return applyHeadToHtml(template, head.render())
}
