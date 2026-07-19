import type { PreparedHtmlTemplateWithIndexes, PreparedTemplate } from '../parser'
import type { SSRHeadPayload, Unhead } from '../types'
import { applyHeadToHtml, parseHtmlForIndexes, parseHtmlForUnheadExtraction } from '../parser'

let extractedTemplates: WeakMap<PreparedTemplate, PreparedHtmlTemplateWithIndexes> | undefined

function extractPreparedTemplate(template: PreparedTemplate): PreparedHtmlTemplateWithIndexes {
  const cache = extractedTemplates ||= new WeakMap()
  let extracted = cache.get(template)
  if (!extracted) {
    extracted = parseHtmlForUnheadExtraction(template.html)
    cache.set(template, extracted)
  }
  return extracted
}

/**
 * Transform an HTML template string by extracting any head tags and attributes from it, pushing them to Unhead,
 * and injecting the resulting head tags back into the HTML.
 * Uses optimized parsing and index-based HTML construction for best performance.
 *
 * Accepts either a raw HTML string (parsed per call) or a `PreparedTemplate`
 * from `prepareTemplate()` for templates that are stable across requests.
 */
/* @__NO_SIDE_EFFECTS__ */
export function transformHtmlTemplate(head: Unhead<any, SSRHeadPayload>, html: string | PreparedTemplate) {
  const template = typeof html === 'string'
    ? parseHtmlForUnheadExtraction(html)
    : extractPreparedTemplate(html)
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
 *
 * Accepts either a raw HTML string (parsed per call) or a `PreparedTemplate`
 * from `prepareTemplate()` for templates that are stable across requests.
 */
/* @__NO_SIDE_EFFECTS__ */
export function transformHtmlTemplateRaw(head: Unhead<any, SSRHeadPayload>, html: string | PreparedTemplate) {
  // For raw mode, we only need indexes, not head extraction
  const template = typeof html === 'string' ? parseHtmlForIndexes(html) : html
  return applyHeadToHtml(template, head.render())
}
