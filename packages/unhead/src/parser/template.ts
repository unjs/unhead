import type { DefaultTreeAdapterMap, DefaultTreeAdapterTypes, Token, TreeAdapter } from 'parse5'
import type { SerializableHead } from '../types'
import type { HeadSlot, HeadSlots } from './streamingMetadata'
import { defaultTreeAdapter, parse, html as parse5Html } from 'parse5'
import { hasOwn } from '../utils/hasOwn'
import { streamingMetadataKind } from './streamingMetadata'

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
}

export interface StreamingHtmlTemplate extends PreparedHtmlTemplateWithIndexes {
  readonly headSlots?: HeadSlots
  readonly hasLegacyCharset?: boolean
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

function trimHtmlWhitespace(value: string): string {
  let start = 0
  let end = value.length
  while (start < end && isWhitespace(value.charCodeAt(start)))
    start++
  while (end > start && isWhitespace(value.charCodeAt(end - 1)))
    end--
  return value.slice(start, end)
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

function getChildElement(parent: DefaultTreeAdapterTypes.ParentNode | undefined, tagName: string) {
  return parent?.childNodes.find((child): child is DefaultTreeAdapterTypes.Element =>
    defaultTreeAdapter.isElementNode(child) && child.tagName === tagName)
}

const BODY_START_RE = /<body[\t\n\f\r />]/gi

function findBodyStartEnd(html: string, start: number) {
  let quote = 0
  for (let i = start + 5; i < html.length; i++) {
    const code = html.charCodeAt(i)
    if (quote) {
      if (code === quote)
        quote = 0
    }
    else if (code === GT_CHAR) {
      return i + 1
    }
    else if (code === QUOTE_CHAR || code === APOS_CHAR) {
      quote = code
    }
    else if (html[i] === '<') {
      break
    }
  }
  return -1
}

function readTemplate(html: string, deferBodyClose: boolean, prepared?: PreparedTemplate['indexes']) {
  if (prepared && prepared.bodyTagEnd >= 0 && prepared.bodyTagEnd < html.length) {
    const prefix = parseTemplateDocument(html.slice(0, prepared.bodyTagEnd))
    if (prefix.indexes.bodyTagEnd === prepared.bodyTagEnd) {
      prefix.indexes.bodyCloseTagStart = prepared.bodyCloseTagStart
      return { ...prefix, partial: false }
    }
  }
  if (deferBodyClose) {
    let attempts = 0
    for (const { index } of html.matchAll(BODY_START_RE)) {
      const end = findBodyStartEnd(html, index)
      if (end > 0 && end < html.length) {
        const prefix = parseTemplateDocument(html.slice(0, end))
        // A text match only limits the scan. The parser must confirm the boundary.
        if (prefix.indexes.bodyTagStart === index && prefix.indexes.bodyTagEnd === end)
          return { ...prefix, partial: true }
      }
      // Bound the number of prefix parses when the template repeats tag text.
      if (++attempts === 2)
        break
    }
  }
  return { ...parseTemplateDocument(html), partial: false }
}

const FOREIGN_CONTENT_RE = /<(?:svg|math)[\t\n\f\r />]/i

function createTemplateTreeAdapter(): TreeAdapter<DefaultTreeAdapterMap> {
  const foreign = new Set<DefaultTreeAdapterTypes.Element>()
  return {
    ...defaultTreeAdapter,
    onItemPush(node) {
      if (node.namespaceURI !== parse5Html.NS.HTML)
        foreign.add(node)
    },
    onItemPop(node) {
      if (node.namespaceURI !== parse5Html.NS.HTML)
        foreign.delete(node)
    },
    setNodeSourceCodeLocation(node, location) {
      if (!foreign.size || !defaultTreeAdapter.isCommentNode(node))
        defaultTreeAdapter.setNodeSourceCodeLocation(node, location)
    },
    updateNodeSourceCodeLocation(node, location) {
      // The HTML parser can record a document close while foreign elements remain open.
      if (foreign.size && location.endTag && defaultTreeAdapter.isElementNode(node)
        && (node.tagName === 'head' || node.tagName === 'body')) {
        return
      }
      defaultTreeAdapter.updateNodeSourceCodeLocation(node, location)
    },
  }
}

function parseTemplateDocument(html: string) {
  const treeAdapter = FOREIGN_CONTENT_RE.test(html) ? createTemplateTreeAdapter() : defaultTreeAdapter
  const document = parse(html, { sourceCodeLocationInfo: true, treeAdapter })
  const root = getChildElement(document, 'html')
  const head = getChildElement(root, 'head')
  const body = getChildElement(root, 'body')
  const rootStart = root?.sourceCodeLocation?.startTag
  const bodyStart = body?.sourceCodeLocation?.startTag

  return {
    root,
    rootStart,
    head,
    bodyStart,
    body,
    indexes: {
      htmlTagStart: rootStart?.startOffset ?? -1,
      htmlTagEnd: rootStart?.endOffset ?? -1,
      headTagEnd: head?.sourceCodeLocation?.endTag?.startOffset ?? -1,
      bodyTagStart: bodyStart?.startOffset ?? -1,
      bodyTagEnd: bodyStart?.endOffset ?? -1,
      bodyCloseTagStart: body?.sourceCodeLocation?.endTag?.startOffset ?? -1,
    },
  }
}

/** Find document tag boundaries without extracting existing tags. */
/* @__PURE__ */
export function parseHtmlForIndexes(html: string, mode: 'stream' | 'body-close' | 'body-open' = 'stream'): PreparedHtmlTemplateWithIndexes {
  const { indexes, body } = readTemplate(html, mode === 'body-open')
  return {
    html,
    input: {},
    indexes,
    bodyOutlet: mode === 'stream' ? findBodyOutlet(html, body, indexes) : undefined,
  }
}

type ReplaceTemplateRange = (start: number, end: number, replacement?: string) => void
interface StreamingHeadMetadata {
  headSlots: HeadSlots
  hasLegacyCharset: boolean
}
/** Extract managed elements from the document head while preserving other markup. */
/* @__PURE__ */
export function parseHtmlForUnheadExtraction(template: string | PreparedTemplate, deferBodyClose = false): PreparedHtmlTemplateWithIndexes {
  const html = typeof template === 'string' ? template : template.html
  const prepared = typeof template !== 'string' && preparedTemplates?.has(template) ? template : undefined
  const { root, rootStart, head, body, bodyStart, indexes, partial } = readTemplate(html, deferBodyClose, prepared?.indexes)
  const input: SerializableHead = {}
  const parts: string[] = []
  let cursor = 0
  let removed = 0

  function replace(start: number, end: number, replacement = '') {
    parts.push(html.slice(cursor, start), replacement)
    cursor = end
    removed += end - start - replacement.length
  }

  if (root && rootStart) {
    const attrs = readAttributes(root, rootStart, false)
    if (Object.keys(attrs).length) {
      input.htmlAttrs = attrs
      replace(indexes.htmlTagStart, indexes.htmlTagEnd, '<html>')
      indexes.htmlTagEnd -= removed
    }
  }

  if (head && indexes.headTagEnd >= 0) {
    extractDocumentHead(html, head, indexes.headTagEnd, input, replace)
    indexes.headTagEnd -= removed
  }

  if (body && bodyStart) {
    indexes.bodyTagStart -= removed
    const attrs = readAttributes(body, bodyStart, false)
    if (Object.keys(attrs).length) {
      input.bodyAttrs = attrs
      replace(bodyStart.startOffset, bodyStart.endOffset, '<body>')
    }
    indexes.bodyTagEnd -= removed
  }
  if (indexes.bodyCloseTagStart >= 0)
    indexes.bodyCloseTagStart -= removed

  return {
    html: parts.length ? parts.join('') + html.slice(cursor) : html,
    input,
    indexes: partial ? withDeferredBodyClose(html, indexes, removed) : indexes,
  }
}

function extractDocumentHead(
  html: string,
  head: DefaultTreeAdapterTypes.Element,
  headTagEnd: number,
  input: SerializableHead,
  replace: ReplaceTemplateRange,
) {
  let whitespaceStart: number | undefined
  for (const node of head.childNodes) {
    if (defaultTreeAdapter.isTextNode(node)) {
      whitespaceStart = node.sourceCodeLocation?.startOffset
      continue
    }

    const precedingText = whitespaceStart
    whitespaceStart = undefined
    if (!defaultTreeAdapter.isElementNode(node) || !node.sourceCodeLocation?.startTag)
      continue

    const { startTag, endTag } = node.sourceCodeLocation
    if ((endTag ?? startTag).endOffset > headTagEnd)
      continue

    // Match the existing output format by removing indentation with extracted tags.
    const start = precedingText !== undefined && !html.slice(precedingText, startTag.startOffset).trim()
      ? precedingText
      : startTag.startOffset
    const { tagName } = node
    switch (tagName) {
      case 'title':
      case 'script':
      case 'style': {
        if (!endTag)
          continue
        const content = html.slice(startTag.endOffset, endTag.startOffset)
        if (tagName === 'script' && !canExtractScript(content))
          continue
        if (tagName === 'title') {
          input.title ||= content.trim() || undefined
        }
        else if (tagName === 'script') {
          (input.script ||= []).push({ ...readAttributes(node, startTag), innerHTML: content } as NonNullable<SerializableHead['script']>[number])
        }
        else {
          (input.style ||= []).push({ ...readAttributes(node, startTag), textContent: content })
        }
        replace(start, endTag.endOffset)
        break
      }
      case 'meta':
        (input.meta ||= []).push(readAttributes(node, startTag) as unknown as NonNullable<SerializableHead['meta']>[number])
        replace(start, startTag.endOffset)
        break
      case 'link':
        (input.link ||= []).push(readAttributes(node, startTag) as unknown as NonNullable<SerializableHead['link']>[number])
        replace(start, startTag.endOffset)
        break
      case 'base':
        if (!input.base) {
          input.base = readAttributes(node, startTag) as unknown as SerializableHead['base']
          replace(start, startTag.endOffset)
        }
        break
    }
  }
}

function extractStreamingHead(html: string, head: DefaultTreeAdapterTypes.Element, headTagEnd: number, input: SerializableHead): StreamingHeadMetadata | undefined {
  let headSlots: HeadSlot[] | undefined
  let count = 0
  let hasLegacyCharset = false
  for (const node of head.childNodes) {
    if (!defaultTreeAdapter.isElementNode(node) || !node.sourceCodeLocation?.startTag)
      continue
    const { startTag, endTag } = node.sourceCodeLocation
    const end = (endTag ?? startTag).endOffset
    if (end > headTagEnd)
      continue
    const kind = streamingMetadataKind(node)
    if (!kind || (kind === 'title' && !endTag))
      continue

    const offset = startTag.startOffset
    const slots = headSlots ||= []
    const firstSlot = !slots.some(slot => slot.kind === kind)
    if (firstSlot)
      count++
    else
      slots.push({ kind: undefined, offset, end })
    if (kind === 'title') {
      const text = node.childNodes.find(defaultTreeAdapter.isTextNode)?.value
      const title = text ? trimHtmlWhitespace(text) : ''
      if (title)
        input.title ||= title
      if (firstSlot) {
        slots.push({
          kind,
          offset,
          end,
          openTag: node.attrs.length ? html.slice(startTag.startOffset, startTag.endOffset) : undefined,
          emptyMarkup: title ? undefined : html.slice(startTag.startOffset, end),
        })
      }
    }
    else {
      const attrs = readAttributes(node, startTag)
      if (kind === 'charset' && attrs.charset.trim().toLowerCase() !== 'utf-8') {
        hasLegacyCharset = true
      }
      (input.meta ||= []).push(attrs as unknown as NonNullable<SerializableHead['meta']>[number])
      if (firstSlot)
        slots.push({ kind, offset, end })
    }
  }
  if (headSlots)
    return { headSlots: { ranges: headSlots, count }, hasLegacyCharset }
}

/* @__PURE__ */
export function parseHtmlForStreamingExtraction(template: string | PreparedTemplate): StreamingHtmlTemplate {
  const html = typeof template === 'string' ? template : template.html
  const prepared = typeof template !== 'string' && preparedTemplates?.has(template) ? template : undefined
  const { root, rootStart, head, body, bodyStart, indexes } = readTemplate(html, false, prepared?.indexes)
  const input: SerializableHead = {}
  if (root && rootStart) {
    const attrs = readAttributes(root, rootStart, false)
    if (Object.keys(attrs).length)
      input.htmlAttrs = attrs
  }
  if (body && bodyStart) {
    const attrs = readAttributes(body, bodyStart, false)
    if (Object.keys(attrs).length)
      input.bodyAttrs = attrs
  }
  // The shell renderer applies metadata edits against the original offsets.
  const metadata = head && indexes.headTagEnd >= 0 ? extractStreamingHead(html, head, indexes.headTagEnd, input) : undefined
  return { html, input, indexes, bodyOutlet: prepared ? prepared.bodyOutlet : findBodyOutlet(html, body, indexes), ...metadata }
}

function withDeferredBodyClose(
  html: string,
  indexes: PreparedHtmlTemplateWithIndexes['indexes'],
  removed: number,
): PreparedHtmlTemplateWithIndexes['indexes'] {
  return {
    ...indexes,
    get bodyCloseTagStart() {
      const offset = parseTemplateDocument(html).indexes.bodyCloseTagStart
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

  const markup = `<head><script>${escaped}</script></head>`
  return parseTemplateDocument(markup).indexes.headTagEnd === markup.length - '</head>'.length
}

// The root attribute serializer escapes ampersands after merging with pushed values.
function readAttributes(node: DefaultTreeAdapterTypes.Element, startTag: Token.LocationWithAttributes, escapeAmpersands = true) {
  const attrs: Record<string, string> = {}
  if (startTag.attrs) {
    for (const { name, value } of node.attrs) {
      if (hasOwn(startTag.attrs, name))
        attrs[name] = escapeAmpersands ? value.replaceAll('&', '&amp;') : value
    }
  }
  return attrs
}

const SSR_OUTLET_RE = /^<!--\s*(?:app-html|ssr-outlet)\s*-->$/

function findBodyOutlet(
  html: string,
  body: DefaultTreeAdapterTypes.Element | undefined,
  { bodyTagEnd, bodyCloseTagStart }: PreparedHtmlTemplateWithIndexes['indexes'],
): PreparedHtmlTemplateWithIndexes['bodyOutlet'] {
  if (!body || bodyTagEnd < 0 || bodyCloseTagStart < 0 || (!html.includes('app-html', bodyTagEnd) && !html.includes('ssr-outlet', bodyTagEnd)))
    return

  const pending: DefaultTreeAdapterTypes.Element[] = [body]
  let first: PreparedHtmlTemplateWithIndexes['bodyOutlet']
  while (pending.length) {
    for (const child of pending.pop()!.childNodes) {
      if (defaultTreeAdapter.isCommentNode(child)) {
        const location = child.sourceCodeLocation
        if (location && location.startOffset >= bodyTagEnd && location.endOffset <= bodyCloseTagStart
          && (!first || location.startOffset < first.start) && SSR_OUTLET_RE.test(html.slice(location.startOffset, location.endOffset))) {
          first = Object.freeze({ start: location.startOffset, end: location.endOffset })
        }
      }
      else if (defaultTreeAdapter.isElementNode(child) && child.namespaceURI === parse5Html.NS.HTML) {
        pending.push(child)
      }
    }
  }
  return first
}

/**
 * Optimized HTML construction function that uses indexes instead of string.replace()
 * This avoids searching through the entire HTML
 */
/* @__PURE__ */
export function applyHeadToHtml(
  template: PreparedHtmlTemplateWithIndexes,
  headHtml: { htmlAttrs: string, headTags: string, bodyAttrs: string, bodyTagsOpen?: string, bodyTags: string },
  headContent?: string,
  end?: number,
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
    parts.push(headContent ?? html.substring(lastIndex, indexes.headTagEnd), headHtml.headTags)
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
    parts.push(html.substring(lastIndex, end))
  }

  return parts.join('')
}
