import type { RenderSSRHeadOptions, Unhead } from '../types'
import { renderSSRHead } from './renderSSRHead'
import { applyHeadToHtml, parseHtmlForIndexes, parseHtmlForUnheadExtraction } from './util'

/**
 * Transform an HTML template string by extracting any head tags and attributes from it, pushing them to Unhead,
 * and injecting the resulting head tags back into the HTML.
 * Uses optimized parsing and index-based HTML construction for best performance.
 */
export async function transformHtmlTemplate(head: Unhead<any>, html: string, options?: RenderSSRHeadOptions) {
  const template = parseHtmlForUnheadExtraction(html)
  head.push(template.input, { _index: 0 })
  const headHtml = await renderSSRHead(head, options)
  return applyHeadToHtml(template, headHtml)
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
export async function transformHtmlTemplateRaw(head: Unhead<any>, html: string, options?: RenderSSRHeadOptions) {
  const headHtml = await renderSSRHead(head, options)
  // For raw mode, we only need indexes, not head extraction
  const template = parseHtmlForIndexes(html)
  return applyHeadToHtml(template, headHtml)
}
