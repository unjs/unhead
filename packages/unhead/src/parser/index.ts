import type { SerializableHead } from '../types'
import { hasOwn } from '../utils/hasOwn'
import { decodeAttribute } from './decodeAttribute'
import { closeTextElement, scanTemplate } from './scanTemplate'

const TAG_HTML = 0
const TAG_HEAD = 1
const TAG_TITLE = 4
const TAG_META = 5
const TAG_BODY = 44
const TAG_SCRIPT = 52
const TAG_STYLE = 53
const TAG_LINK = 54
const TAG_BASE = 56
// Cache frequently used character codes
const GT_CHAR = 62 // '>'
const EQUALS_CHAR = 61 // '='
const QUOTE_CHAR = 34 // '"'
const APOS_CHAR = 39 // '\''

// Map string tag names to numeric constants
export const TagIdMap = /* @__PURE__ */ {
  html: TAG_HTML,
  head: TAG_HEAD,
  title: TAG_TITLE,
  meta: TAG_META,
  body: TAG_BODY,
  script: TAG_SCRIPT,
  style: TAG_STYLE,
  link: TAG_LINK,
  base: TAG_BASE,
} as const

export interface PreparedHtmlTemplate {
  html: string
  input: SerializableHead
}

export interface PreparedHtmlTemplateWithIndexes {
  html: string
  input: SerializableHead
  indexes: {
    htmlTagStart: number
    htmlTagEnd: number
    headTagEnd: number
    bodyTagStart: number
    bodyTagEnd: number
    bodyCloseTagStart: number
  }
  bodyOutlet?: Readonly<{ start: number, end: number }>
  /** @internal */
  canAppendAtEnd?: true
  /**
   * Source slots for policies that participate in managed deduplication.
   * @internal
   */
  policySlots?: ReadonlyArray<{
    start: number
    end: number
    attrs: Readonly<Record<string, string>>
  }>
}

declare const PreparedTemplateBrand: unique symbol
let preparedTemplates: WeakSet<PreparedTemplate> | undefined

/**
 * A reusable parsed HTML template.
 *
 * The object owns the exact `html` string its indexes describe, so it can be
 * safely reused across many renders/requests without re-parsing and without
 * any risk of indexes drifting from the template they were computed for.
 *
 * Create one with {@link prepareTemplate}.
 *
 * @experimental The prepared-template API may change in a future minor release.
 */
export interface PreparedTemplate extends PreparedHtmlTemplateWithIndexes {
  readonly [PreparedTemplateBrand]: true
  readonly html: string
  readonly input: SerializableHead
  readonly indexes: Readonly<PreparedHtmlTemplateWithIndexes['indexes']>
}

/**
 * Parse an HTML template once so it can be reused across many renders/requests.
 *
 * Server and streaming functions that accept an HTML `template` string
 * (`transformHtmlTemplate`, `transformHtmlTemplateRaw`, `renderSSRHeadShell`,
 * `prepareStreamingTemplate`, `wrapStream`) also accept the returned
 * `PreparedTemplate`, skipping the per-request template parse.
 *
 * The returned value is immutable. Unhead does not cache templates by their
 * HTML string, so the caller controls the value's lifetime. It contains no
 * request or head state: keep it at process scope and create a new head for
 * each request.
 *
 * @experimental The prepared-template API may change in a future minor release.
 *
 * @example
 * ```ts
 * const template = prepareTemplate(await readFile('index.html', 'utf-8'))
 * // per request
 * const html = transformHtmlTemplateRaw(head, template)
 * ```
 */
/* @__PURE__ */
export function prepareTemplate(html: string): PreparedTemplate {
  const template = parseHtmlForIndexes(html)
  Object.freeze(template.input)
  Object.freeze(template.indexes)
  const prepared = Object.freeze(template) as PreparedTemplate
  ;(preparedTemplates ||= new WeakSet()).add(prepared)
  return prepared
}

/**
 * Fast whitespace check using direct character code comparison
 */
function isWhitespace(charCode: number): boolean {
  return charCode === 32 // SPACE_CHAR
    || charCode === 9 // TAB_CHAR
    || charCode === 10 // NEWLINE_CHAR
    || charCode === 12 // FORM_FEED_CHAR
    || charCode === 13 // CARRIAGE_RETURN_CHAR
}

/**
 * Parse HTML attributes string into key-value object
 */
/* @__PURE__ */
export function parseAttributes(attrStr: string): Record<string, string> {
  if (!attrStr)
    return {}

  const result: Record<string, string> = {}
  const setAttr = (attrName: string, value: string) => {
    // Browsers keep the first duplicate attribute. Preserve that behavior so
    // template extraction cannot rewrite inert tags into active ones.
    if (!hasOwn(result, attrName))
      result[attrName] = value
  }
  const len = attrStr.length
  let i = 0

  // State machine states
  const WHITESPACE = 0
  const NAME = 1
  const AFTER_NAME = 2
  const BEFORE_VALUE = 3
  const QUOTED_VALUE = 4
  const UNQUOTED_VALUE = 5

  let state = WHITESPACE
  let nameStart = 0
  let nameEnd = 0
  let valueStart = 0
  let quoteChar = 0
  let name = ''

  while (i < len) {
    const charCode = attrStr.charCodeAt(i)
    const isSpace = isWhitespace(charCode)

    switch (state) {
      case WHITESPACE:
        if (!isSpace) {
          state = NAME
          nameStart = i
          nameEnd = 0 // Reset nameEnd when starting a new attribute
        }
        break

      case NAME:
        if (charCode === EQUALS_CHAR || isSpace) {
          nameEnd = i
          name = attrStr.substring(nameStart, nameEnd).toLowerCase()
          state = charCode === EQUALS_CHAR ? BEFORE_VALUE : AFTER_NAME
        }
        break

      case AFTER_NAME:
        if (charCode === EQUALS_CHAR) {
          state = BEFORE_VALUE
        }
        else if (!isSpace) {
          setAttr(name, '')
          state = NAME
          nameStart = i
          nameEnd = 0 // Reset nameEnd when starting a new attribute
        }
        break

      case BEFORE_VALUE:
        if (charCode === QUOTE_CHAR || charCode === APOS_CHAR) {
          quoteChar = charCode
          state = QUOTED_VALUE
          valueStart = i + 1
        }
        else if (!isSpace) {
          state = UNQUOTED_VALUE
          valueStart = i
        }
        break

      case QUOTED_VALUE:
        // HTML attribute values have no backslash escaping; the quote char
        // always terminates the value (matches browser parsing and the
        // tag-boundary scanner above).
        if (charCode === quoteChar) {
          setAttr(name, attrStr.substring(valueStart, i))
          state = WHITESPACE
        }
        break

      case UNQUOTED_VALUE:
        if (isSpace || charCode === GT_CHAR) {
          setAttr(name, attrStr.substring(valueStart, i))
          state = WHITESPACE
        }
        break
    }

    i++
  }

  // Handle the last attribute
  if (state === QUOTED_VALUE || state === UNQUOTED_VALUE) {
    if (name) {
      setAttr(name, attrStr.substring(valueStart, i))
    }
  }
  else if (state === NAME || state === AFTER_NAME || state === BEFORE_VALUE) {
    nameEnd = nameEnd || i
    const currentName = attrStr.substring(nameStart, nameEnd).toLowerCase()
    if (currentName) {
      setAttr(currentName, '')
    }
  }

  return result
}

function readTemplate(html: string, deferBodyClose: boolean, collectHead: boolean, prepared?: PreparedTemplate['indexes']) {
  const scan = scanTemplate(html, deferBodyClose || !!prepared, collectHead)
  const { root, body, headClose, headElements, outlet } = scan
  const bodyClose = prepared && body?.end === prepared.bodyTagEnd ? prepared.bodyCloseTagStart : scan.bodyClose
  return {
    root,
    body,
    headElements,
    bodyOutlet: outlet,
    canAppendAtEnd: scan.canAppendAtEnd,
    partial: deferBodyClose && !prepared && body !== undefined,
    indexes: {
      htmlTagStart: root?.start ?? -1,
      htmlTagEnd: root?.end ?? -1,
      headTagEnd: headClose ?? -1,
      bodyTagStart: body?.start ?? -1,
      bodyTagEnd: body?.end ?? -1,
      bodyCloseTagStart: bodyClose ?? -1,
    },
  }
}

/** Find document tag boundaries without extracting existing tags. */
/* @__PURE__ */
export function parseHtmlForIndexes(html: string, mode: 'stream' | 'body-close' | 'body-open' = 'stream'): PreparedHtmlTemplateWithIndexes {
  const { indexes, bodyOutlet, canAppendAtEnd } = readTemplate(html, mode === 'body-open', false)
  return {
    html,
    input: {},
    indexes,
    bodyOutlet: mode === 'stream' ? bodyOutlet : undefined,
    canAppendAtEnd: mode === 'stream' ? canAppendAtEnd : undefined,
  }
}

/** Extract managed elements from the document head while preserving other markup. */
/* @__PURE__ */
export function parseHtmlForUnheadExtraction(template: string | PreparedTemplate, deferBodyClose = false): PreparedHtmlTemplateWithIndexes {
  const html = typeof template === 'string' ? template : template.html
  const prepared = typeof template !== 'string' && preparedTemplates?.has(template) ? template.indexes : undefined
  const { root, headElements, body, indexes, partial } = readTemplate(html, deferBodyClose, true, prepared)
  const input: SerializableHead = {}
  const parts: string[] = []
  const policySlots: NonNullable<PreparedHtmlTemplateWithIndexes['policySlots']>[number][] = []
  let cursor = 0
  let removed = 0

  function replace(start: number, end: number, replacement = '') {
    parts.push(html.slice(cursor, start), replacement)
    cursor = end
    removed += end - start - replacement.length
  }

  if (root) {
    const attrs = readAttributes(root.attributes, false)
    if (Object.keys(attrs).length) {
      input.htmlAttrs = attrs
      replace(indexes.htmlTagStart, indexes.htmlTagEnd, '<html>')
      indexes.htmlTagEnd -= removed
    }
  }

  if (indexes.headTagEnd >= 0) {
    for (const { tag: startTag, close: endTag, start } of headElements) {
      const tagName = startTag.name
      switch (tagName) {
        case 'title':
        case 'script':
        case 'style': {
          if (!endTag)
            continue
          const content = html.slice(startTag.end, endTag.start)
          if (tagName === 'script' && !canExtractScript(content))
            continue
          if (tagName === 'title')
            input.title ||= content.trim() || undefined
          else if (tagName === 'script')
            (input.script ||= []).push({ ...readAttributes(startTag.attributes), innerHTML: content } as NonNullable<SerializableHead['script']>[number])
          else
            (input.style ||= []).push({ ...readAttributes(startTag.attributes), textContent: content })
          replace(start, endTag.end)
          break
        }
        case 'meta': {
          const attrs = readAttributes(startTag.attributes)
          ;(input.meta ||= []).push(attrs as unknown as NonNullable<SerializableHead['meta']>[number])
          // Deduplicate policies with managed input, but keep their output slot.
          // Meta-delivered policies apply only to subsequent content.
          if (attrs['http-equiv']?.toLowerCase() === 'content-security-policy') {
            policySlots.push({ start: startTag.start - removed, end: startTag.end - removed, attrs: Object.freeze({ ...attrs }) })
            continue
          }
          replace(start, startTag.end)
          break
        }
        case 'link':
          (input.link ||= []).push(readAttributes(startTag.attributes) as unknown as NonNullable<SerializableHead['link']>[number])
          replace(start, startTag.end)
          break
        case 'base':
          if (!input.base) {
            input.base = readAttributes(startTag.attributes) as unknown as SerializableHead['base']
            replace(start, startTag.end)
          }
          break
      }
    }
    indexes.headTagEnd -= removed
  }

  if (body) {
    indexes.bodyTagStart -= removed
    const attrs = readAttributes(body.attributes, false)
    if (Object.keys(attrs).length) {
      input.bodyAttrs = attrs
      replace(body.start, body.end, '<body>')
    }
    indexes.bodyTagEnd -= removed
  }
  if (indexes.bodyCloseTagStart >= 0)
    indexes.bodyCloseTagStart -= removed

  return {
    html: parts.length ? parts.join('') + html.slice(cursor) : html,
    input,
    policySlots: policySlots.length ? Object.freeze(policySlots.map(slot => Object.freeze(slot))) : undefined,
    indexes: partial ? withDeferredBodyClose(html, indexes, removed) : indexes,
  }
}

function withDeferredBodyClose(
  html: string,
  indexes: PreparedHtmlTemplateWithIndexes['indexes'],
  removed: number,
): PreparedHtmlTemplateWithIndexes['indexes'] {
  return {
    ...indexes,
    get bodyCloseTagStart() {
      const offset = scanTemplate(html, false).bodyClose ?? -1
      return offset >= 0 ? offset - removed : -1
    },
  }
}

const SCRIPT_START_RE = /<script[\t\n\f\r />]/i
const SCRIPT_END_RE = /<\/script/gi

function canExtractScript(content: string) {
  if (!content.includes('<!--') || !SCRIPT_START_RE.test(content))
    return true

  const escaped = content.replace(SCRIPT_END_RE, '<\\/script')
  if (escaped === content)
    return true

  return closeTextElement(`${escaped}</script>`, 'script', 0)?.start === escaped.length
}

function readAttributes(raw: Record<string, string> | undefined, escapeAmpersands = true) {
  const attrs: Record<string, string> = {}
  for (const key in raw) {
    const value = decodeAttribute(raw[key])
    attrs[key] = escapeAmpersands ? value.replaceAll('&', '&amp;') : value
  }
  return attrs
}

/**
 * Optimized HTML construction function that uses indexes instead of string.replace()
 * This avoids searching through the entire HTML
 */
/* @__PURE__ */
export function applyHeadToHtml(
  template: PreparedHtmlTemplateWithIndexes,
  headHtml: { htmlAttrs: string, headTags: string, bodyAttrs: string, bodyTagsOpen?: string, bodyTags: string },
): string {
  const { html, indexes } = template
  const parts: string[] = []
  let lastIndex = 0

  // 1. Content up to <html> tag
  if (indexes.htmlTagStart >= 0) {
    parts.push(html.substring(lastIndex, indexes.htmlTagStart))
    parts.push(`<html${headHtml.htmlAttrs}>`)
    lastIndex = indexes.htmlTagEnd
  }

  // 2. Content up to </head> tag and inject headTags
  if (indexes.headTagEnd >= 0) {
    if (template.policySlots) {
      // Scan rendered markup so renderer hooks and escaping remain authoritative.
      const rendered = `<head>${headHtml.headTags}</head>`
      const policies = scanTemplate(rendered, true, true).headElements.filter(({ tag }) =>
        tag.name === 'meta' && decodeAttribute(tag.attributes?.['http-equiv'] || '').toLowerCase() === 'content-security-policy',
      )
      const used = new Set<typeof policies[number]>()
      for (const slot of template.policySlots) {
        parts.push(html.substring(lastIndex, slot.start))
        for (const policy of policies) {
          const attrs = readAttributes(policy.tag.attributes)
          if (used.has(policy) || attrs['http-equiv'] !== slot.attrs['http-equiv'])
            continue
          used.add(policy)
          const unchanged = Object.keys(attrs).length === Object.keys(slot.attrs).length
            && Object.keys(attrs).every(key => attrs[key] === slot.attrs[key])
          parts.push(unchanged ? html.slice(slot.start, slot.end) : rendered.slice(policy.tag.start, policy.tag.end))
        }
        lastIndex = slot.end
      }
      let cursor = 6 // Skip the synthetic <head> wrapper.
      const remaining: string[] = []
      for (const policy of policies) {
        if (used.has(policy)) {
          const trailingLineBreak = rendered[policy.tag.end] === '\n'
          const start = !trailingLineBreak && rendered[policy.tag.start - 1] === '\n' ? policy.tag.start - 1 : policy.tag.start
          remaining.push(rendered.slice(cursor, Math.max(cursor, start)))
          cursor = policy.tag.end + (trailingLineBreak ? 1 : 0)
        }
      }
      remaining.push(rendered.slice(cursor, -7))
      headHtml = { ...headHtml, headTags: remaining.join('') }
    }
    parts.push(html.substring(lastIndex, indexes.headTagEnd))
    parts.push(headHtml.headTags)
    lastIndex = indexes.headTagEnd
  }

  // 3. Content up to <body> tag and modify it
  if (indexes.bodyTagStart >= 0) {
    parts.push(html.substring(lastIndex, indexes.bodyTagStart))
    if (headHtml.bodyTagsOpen) {
      parts.push(`<body${headHtml.bodyAttrs}>\n${headHtml.bodyTagsOpen}`)
    }
    else {
      parts.push(`<body${headHtml.bodyAttrs}>`)
    }
    lastIndex = indexes.bodyTagEnd
  }

  // 4. Content up to </body> tag and inject bodyTags
  const bodyClose = headHtml.bodyTags ? indexes.bodyCloseTagStart : -1
  if (bodyClose >= 0) {
    parts.push(html.substring(lastIndex, bodyClose))
    parts.push(headHtml.bodyTags)
    parts.push(html.substring(bodyClose))
  }
  else {
    // No closing body tag found, just append the rest
    parts.push(html.substring(lastIndex))
  }

  return parts.join('')
}
