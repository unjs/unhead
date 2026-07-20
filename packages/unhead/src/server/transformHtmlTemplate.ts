import type { PreparedHtmlTemplateWithIndexes, PreparedTemplate } from '../parser'
import type { HeadTag, SSRHeadPayload, Unhead } from '../types'
import { applyHeadToHtml, parseHtmlForIndexes, parseHtmlForUnheadExtraction } from '../parser'
import { dedupeKey, hashTag } from '../utils/dedupe'
import { normalizeEntryToTags } from '../utils/normalize'
import { capoTagWeight } from './sort'

interface ExtractedTemplateCache {
  template: PreparedHtmlTemplateWithIndexes
  tags: HeadTag[]
}

let extractedTemplates: WeakMap<PreparedTemplate, ExtractedTemplateCache> | undefined

function cloneExtractedInput<T>(value: T): T {
  if (Array.isArray(value))
    return value.map(cloneExtractedInput) as T
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const clone: Record<string, unknown> = {}
    for (const key of Object.keys(value))
      clone[key] = cloneExtractedInput((value as Record<string, unknown>)[key])
    return clone as T
  }
  return value
}

function freezeExtractedInput<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value)
      freezeExtractedInput(item)
  }
  else if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    for (const key of Object.keys(value))
      freezeExtractedInput((value as Record<string, unknown>)[key])
  }
  return value && typeof value === 'object' ? Object.freeze(value) : value
}

function hasHooks<Input, RenderResult>(head: Unhead<Input, RenderResult>): boolean {
  const hooks = (head.hooks as any)?._hooks || {}
  for (const key in hooks) {
    if (hooks[key]?.length)
      return true
  }
  return false
}

function precomputeExtractedTags(input: PreparedHtmlTemplateWithIndexes['input']): HeadTag[] {
  const tags = normalizeEntryToTags(input, [])
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]
    tag._w = capoTagWeight(tag)
    tag._p = i
    tag._d = dedupeKey(tag)
    if (!tag._d)
      tag._h = hashTag(tag)
  }
  return tags
}

function extractPreparedTemplate(prepared: PreparedTemplate): ExtractedTemplateCache {
  const cache = extractedTemplates ||= new WeakMap()
  let extracted = cache.get(prepared)
  if (!extracted) {
    const template = parseHtmlForUnheadExtraction(prepared.html)
    freezeExtractedInput(template.input)
    Object.freeze(template.indexes)
    Object.freeze(template)
    const tags = precomputeExtractedTags(template.input)
    freezeExtractedInput(tags)
    extracted = Object.freeze({
      template,
      tags,
    })
    cache.set(prepared, extracted)
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
  let cached: ExtractedTemplateCache | undefined
  let template: PreparedHtmlTemplateWithIndexes
  if (typeof html === 'string') {
    template = parseHtmlForUnheadExtraction(html)
  }
  else {
    cached = extractPreparedTemplate(html)
    template = cached.template
  }
  // Entry hooks are allowed to mutate their request's input. Never expose the
  // cached extraction object or one request can affect every later request
  // that reuses the same prepared template.
  const hooked = cached ? hasHooks(head) : false
  const hasDynamicResolver = cached
    ? head.resolvedOptions.propResolvers?.some(resolver => !resolver._static) || false
    : false
  const input = cached && (hooked || hasDynamicResolver) ? cloneExtractedInput(template.input) : template.input
  head.push(input, { _index: 0 })
  if (cached
    && !hooked
    && head.resolvedOptions._tagWeight === capoTagWeight
    && !hasDynamicResolver) {
    const entry = head.entries.get(0)
    if (entry)
      entry._precomputedTags = cached.tags
  }
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
