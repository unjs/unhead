import type { SerializableHead } from '../types'
import type { PreparedHtmlTemplateWithIndexes, PreparedTemplate } from './index'
import type { HeadSlot, HeadSlots } from './streamingMetadata'
import { hasOwn } from '../utils/hasOwn'
import { decodeAttribute } from './decodeAttribute'

const COMMENT_END = /--!?>/g
const OUTLET = /^<!--\s*(?:app-html|ssr-outlet)\s*-->$/
const ASCII_UPPER = /[A-Z]/g
const NON_WHITESPACE = /[^\t\n\f\r ]/

const HEAD_VOID = /* @__PURE__ */ new Set(['base', 'basefont', 'bgsound', 'link', 'meta'])
const HEAD_TEXT = /* @__PURE__ */ new Set(['title', 'style', 'script', 'noscript', 'noframes'])
const BODY_TEXT = /* @__PURE__ */ new Set(['textarea', 'xmp', 'iframe', 'noembed'])
const BODY_SCOPE_BARRIERS = /* @__PURE__ */ new Set(['applet', 'marquee', 'object'])
const SCOPED = /* @__PURE__ */ new Set(['applet', 'marquee', 'object', 'select', 'table', 'template'])
const SELECT_CONTENT = /* @__PURE__ */ new Set(['button', 'option', 'optgroup', 'hr', 'script', 'template', 'selectedcontent'])
const SELECT_FORMATTING = /* @__PURE__ */ new Set([
  'abbr',
  'b',
  'bdi',
  'bdo',
  'br',
  'cite',
  'code',
  'data',
  'del',
  'dfn',
  'div',
  'em',
  'i',
  'img',
  'ins',
  'kbd',
  'legend',
  'mark',
  'picture',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'small',
  'source',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
  'wbr',
])
const TABLE_SECTIONS = /* @__PURE__ */ new Set(['tbody', 'tfoot', 'thead'])
const SVG_INTEGRATION = /* @__PURE__ */ new Set(['desc', 'foreignobject', 'title'])
const SELECT_SVG_ELEMENTS = /* @__PURE__ */ new Set([
  'circle',
  'clippath',
  'defs',
  'desc',
  'ellipse',
  'g',
  'image',
  'line',
  'lineargradient',
  'mask',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialgradient',
  'rect',
  'stop',
  'svg',
  'symbol',
  'title',
  'use',
])
const MATH_INTEGRATION = /* @__PURE__ */ new Set(['mi', 'mn', 'mo', 'ms', 'mtext'])
const VOID_HTML = /* @__PURE__ */ new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
const DOCUMENT_SCOPES = /* @__PURE__ */ new Set(['body', 'frameset', 'head', 'html', 'plaintext'])
const IMPLIED_END = /* @__PURE__ */ new Set(['dd', 'dt', 'li', 'optgroup', 'option', 'p', 'rb', 'rp', 'rt', 'rtc'])
const RUBY_TEXT = /* @__PURE__ */ new Set(['rb', 'rp', 'rt', 'rtc'])
const CLOSES_IMPLIED_CHILDREN = /* @__PURE__ */ new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'center',
  'dd',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'header',
  'hgroup',
  'li',
  'listing',
  'main',
  'menu',
  'nav',
  'ol',
  'p',
  'pre',
  'search',
  'section',
  'summary',
  'ul',
])
const HTML_IN_FOREIGN = /* @__PURE__ */ new Set([
  'b',
  'big',
  'blockquote',
  'body',
  'br',
  'center',
  'code',
  'dd',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'hr',
  'i',
  'img',
  'li',
  'listing',
  'menu',
  'meta',
  'nobr',
  'ol',
  'p',
  'pre',
  'ruby',
  's',
  'small',
  'span',
  'strong',
  'strike',
  'sub',
  'sup',
  'table',
  'tt',
  'u',
  'ul',
  'var',
])

interface SourceTag {
  name: string
  start: number
  end: number
  closing: boolean
  selfClosing: boolean
  attributes?: Record<string, string>
}

interface HeadElement {
  tag: SourceTag
  close?: SourceTag
  start: number
}

type ForeignElement
  = | { name: string, context: 'svg' | 'math' | 'math-html' }
    | { name: string, context: 'html', scope: number }

export interface TemplateScan {
  root?: SourceTag
  body?: SourceTag
  bodyClose?: number
  headClose?: number
  outlet?: { start: number, end: number }
  canAppendAtEnd?: true
  headElements: HeadElement[]
}

function isWsCode(c: number): boolean {
  return c === 32 || c === 9 || c === 10 || c === 12 || c === 13
}

function isTagDelimCode(c: number): boolean {
  return c === 62 || c === 32 || c === 47 || c === 10 || c === 9 || c === 13 || c === 12
}

function isAsciiAlphaCode(c: number): boolean {
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90)
}

function skipSpace(html: string, cursor: number): number {
  const len = html.length
  while (cursor < len && isWsCode(html.charCodeAt(cursor)))
    cursor++
  return cursor
}

function asciiLower(value: string) {
  return value.replace(ASCII_UPPER, letter => letter.toLowerCase())
}

function readTag(html: string, start: number, collectAttributes = false): SourceTag | undefined {
  const len = html.length
  let cursor = start + 1
  if (cursor >= len)
    return

  let closing = false
  if (html.charCodeAt(cursor) === 47) { // '/'
    closing = true
    cursor++
  }

  const nameStart = cursor
  const firstCode = html.charCodeAt(cursor)
  if (!isAsciiAlphaCode(firstCode))
    return

  let nameHasUpper = firstCode >= 65 && firstCode <= 90
  cursor++
  while (cursor < len) {
    const c = html.charCodeAt(cursor)
    if (isTagDelimCode(c))
      break
    if (c === 60 || c === 61 || c === 34 || c === 39 || c === 96)
      return
    if (c >= 65 && c <= 90)
      nameHasUpper = true
    cursor++
  }
  if (cursor >= len || !isTagDelimCode(html.charCodeAt(cursor)))
    return

  const rawName = html.slice(nameStart, cursor)
  const name = nameHasUpper ? asciiLower(rawName) : rawName
  const attributes: Record<string, string> | undefined = !closing && (collectAttributes || name === 'annotation-xml' || name === 'font') ? {} : undefined

  while (cursor < len) {
    cursor = skipSpace(html, cursor)
    const code = html.charCodeAt(cursor)
    if (code === 62) // '>'
      return { name, start, end: cursor + 1, closing, selfClosing: false, attributes }
    if (code === 47) { // '/'
      if (html.charCodeAt(cursor + 1) === 62)
        return { name, start, end: cursor + 2, closing, selfClosing: true, attributes }
      cursor++
      continue
    }

    const attrNameStart = cursor
    let attrHasUpper = false
    if (code === 61) // '='
      cursor++
    while (cursor < len) {
      const c = html.charCodeAt(cursor)
      if (isWsCode(c) || c === 47 || c === 61 || c === 62)
        break
      if (c >= 65 && c <= 90)
        attrHasUpper = true
      cursor++
    }
    if (cursor === attrNameStart)
      return
    const attrNameEnd = cursor

    cursor = skipSpace(html, cursor)
    let value = ''
    if (html.charCodeAt(cursor) === 61) { // '='
      cursor = skipSpace(html, cursor + 1)
      const quote = html.charCodeAt(cursor)
      if (quote === 34 || quote === 39) {
        const end = html.indexOf(quote === 34 ? '"' : '\'', cursor + 1)
        if (end < 0)
          return
        if (attributes)
          value = html.slice(cursor + 1, end)
        cursor = end + 1
      }
      else {
        const valStart = cursor
        while (cursor < len) {
          const c = html.charCodeAt(cursor)
          if (isWsCode(c) || c === 62)
            break
          cursor++
        }
        if (attributes)
          value = html.slice(valStart, cursor)
      }
    }

    if (attributes) {
      let key = html.slice(attrNameStart, attrNameEnd)
      if (attrHasUpper)
        key = asciiLower(key)
      if (key.includes('\0'))
        key = key.replaceAll('\0', '\uFFFD')
      if (key !== '__proto__' && !hasOwn(attributes, key)) {
        if (value.includes('\r'))
          value = value.replace(/\r\n?/g, '\n')
        if (value.includes('\0'))
          value = value.replaceAll('\0', '\uFFFD')
        attributes[key] = value
      }
    }
  }
}

function endComment(html: string, start: number) {
  if (html[start] === '>')
    return start + 1
  if (html.startsWith('->', start))
    return start + 2
  COMMENT_END.lastIndex = start
  return COMMENT_END.test(html) ? COMMENT_END.lastIndex : -1
}

function isHtmlIntegration(parent: ForeignElement, child: string) {
  if (parent.context === 'svg')
    return SVG_INTEGRATION.has(parent.name)
  if (parent.context === 'math-html' || (parent.context === 'math' && parent.name === 'annotation-xml' && child === 'svg'))
    return true
  return parent.context === 'math' && MATH_INTEGRATION.has(parent.name) && child !== 'mglyph' && child !== 'malignmark'
}

function matchesScriptName(html: string, start: number) {
  return isTagDelimCode(html.charCodeAt(start + 6))
    && (html.charCodeAt(start) | 32) === 115
    && (html.charCodeAt(start + 1) | 32) === 99
    && (html.charCodeAt(start + 2) | 32) === 114
    && (html.charCodeAt(start + 3) | 32) === 105
    && (html.charCodeAt(start + 4) | 32) === 112
    && (html.charCodeAt(start + 5) | 32) === 116
}

function closeScript(html: string, start: number) {
  let scriptData = 0 // 0=normal, 1=escaped, 2=double-escaped
  let cursor = start
  let dash = -2 // Next '-->' at or after cursor; -1 when absent.
  while (cursor < html.length) {
    if (scriptData === 0) {
      const lt = html.indexOf('<', cursor)
      if (lt < 0)
        return
      const c1 = html.charCodeAt(lt + 1)
      if (c1 === 47 && matchesScriptName(html, lt + 2))
        return readTag(html, lt)
      if (c1 === 33 && html.charCodeAt(lt + 2) === 45 && html.charCodeAt(lt + 3) === 45)
        scriptData = 1
      cursor = lt + 1
    }
    else {
      const lt = html.indexOf('<', cursor)
      if (dash !== -1 && dash < cursor)
        dash = html.indexOf('-->', cursor)
      if (dash >= 0 && (lt < 0 || dash < lt)) {
        scriptData = 0
        cursor = dash + 3
      }
      else if (lt >= 0) {
        const c1 = html.charCodeAt(lt + 1)
        if (c1 === 47 && matchesScriptName(html, lt + 2)) {
          if (scriptData !== 2)
            return readTag(html, lt)
          scriptData = 1
          cursor = lt + 8
        }
        else if (scriptData === 1 && matchesScriptName(html, lt + 1)) {
          scriptData = 2
          cursor = lt + 7
        }
        else {
          cursor = lt + 1
        }
      }
      else {
        return
      }
    }
  }
}

/** Find the actual end tag of an HTML text element. */
export function closeTextElement(html: string, name: string, start: number) {
  if (name === 'script')
    return closeScript(html, start)
  const nlen = name.length
  let pos = start
  while (true) {
    const idx = html.indexOf('</', pos)
    if (idx < 0)
      return
    if (isTagDelimCode(html.charCodeAt(idx + 2 + nlen))) {
      let match = true
      for (let i = 0; i < nlen; i++) {
        if ((html.charCodeAt(idx + 2 + i) | 32) !== name.charCodeAt(i)) {
          match = false
          break
        }
      }
      if (match)
        return readTag(html, idx)
    }
    pos = idx + 2
  }
}

function selectToken(name: string, closing: boolean): 'skip' | 'scan' | 'stop' {
  // These elements cannot change the tokenizer or close the select. Some
  // browsers ignore them and others retain them in a customizable option.
  if (SELECT_FORMATTING.has(name))
    return 'skip'
  return (name === 'select' ? closing : SELECT_CONTENT.has(name)) ? 'scan' : 'stop'
}

function closeSelectSvg(html: string, cursor: number): number | undefined {
  // Older browsers ignore SVG tags in a select. Only consume balanced icons
  // whose contents keep both the HTML and SVG tokenizers in the data state.
  const stack = ['svg']
  while (stack.length) {
    const start = html.indexOf('<', cursor)
    if (start < 0)
      return
    const current = stack[stack.length - 1]
    if (html.startsWith('<!--', start)) {
      const end = endComment(html, start + 4)
      if (end < 0)
        return
      cursor = end
      continue
    }
    const tag = readTag(html, start)
    if (!tag)
      return
    if (tag.closing) {
      if (tag.name !== current)
        return
      stack.pop()
    }
    else {
      if (SVG_INTEGRATION.has(current) || !SELECT_SVG_ELEMENTS.has(tag.name))
        return
      if (!tag.selfClosing)
        stack.push(tag.name)
    }
    cursor = tag.end
  }
  return cursor
}

function closeForeignElement(stack: ForeignElement[], name: string): boolean {
  const parent = stack.at(-1)
  const scope = parent?.context === 'html' ? parent.scope : -1
  if (parent?.context === 'html' && SCOPED.has(name)) {
    if (scope < 0 || stack[scope].name !== name)
      return false
    // Closing an HTML scope also closes its remaining HTML descendants.
    // Keep the surrounding foreign elements until their own end tags.
    stack.length = scope
    return true
  }
  let depth = stack.length
  const scopeName = stack[scope]?.name
  const tableSection = scopeName === 'table' && TABLE_SECTIONS.has(name)
  const tableRow = scopeName === 'table' && name === 'tr'
  const tableCell = scopeName === 'table' && (name === 'td' || name === 'th')
  const optionGroup = scopeName === 'select' && name === 'optgroup'
  const ruby = name === 'ruby'
  const impliedChildren = tableCell || CLOSES_IMPLIED_CHILDREN.has(name)
  if (tableSection || tableRow || optionGroup || ruby || impliedChildren) {
    while (depth > 0) {
      const current = stack[depth - 1]
      if (current.name === name || current.context !== 'html')
        break
      const child = current.name
      if (!(impliedChildren && IMPLIED_END.has(child))
        && !((tableRow || tableSection) && (child === 'td' || child === 'th'))
        && !(tableSection && child === 'tr')
        && !(optionGroup && child === 'option')
        && !(ruby && RUBY_TEXT.has(child))) {
        break
      }
      depth--
    }
  }
  if (stack[depth - 1]?.name !== name)
    return false
  stack.length = depth - 1
  return true
}

/**
 * Read only the boundaries needed by the template helpers. Keep proven prefix
 * offsets if the scan reaches markup whose parsing context it cannot verify.
 */
export function scanTemplate(html: string, stopAtBody: boolean, collectHead = false, resumeBodyEnd?: number): TemplateScan {
  const result: TemplateScan = { headElements: [] }
  const foreign: ForeignElement[] = []
  const scopes: string[] = []
  let phase: 'root' | 'before-head' | 'head' | 'after-head' | 'body' = resumeBodyEnd !== undefined ? 'body' : 'root'
  let explicitHead = false
  let templateDepth = 0
  let cursor = resumeBodyEnd ?? (html.charCodeAt(0) === 0xFEFF ? 1 : 0)

  while (true) {
    const start = html.indexOf('<', cursor)
    if (start < 0) {
      if (!scopes.length && !foreign.length)
        result.canAppendAtEnd = true
      break
    }

    let textHasNonWs = false
    const textStart = cursor
    if (phase !== 'body') {
      let hasAmp = false
      for (let i = cursor; i < start; i++) {
        const c = html.charCodeAt(i)
        if (!isWsCode(c)) {
          textHasNonWs = true
          if (c === 38)
            hasAmp = true
        }
      }
      if (!scopes.length && textHasNonWs
        && (!hasAmp || NON_WHITESPACE.test(decodeAttribute(html.slice(cursor, start))))) {
        phase = 'body'
      }
    }

    if (html.startsWith('<!--', start)) {
      const end = endComment(html, start + 4)
      if (end < 0)
        break
      if (phase === 'body' && !templateDepth && !foreign.length && !result.outlet
        && OUTLET.test(html.slice(start, end))) {
        result.outlet = Object.freeze({ start, end })
      }
      cursor = end
      continue
    }

    const parent = foreign.at(-1)
    if (parent && parent.context !== 'html' && html.startsWith('<![CDATA[', start)) {
      const end = html.indexOf(']]>', start + 9)
      if (end < 0)
        break
      cursor = end + 3
      continue
    }

    const nextCode = html.charCodeAt(start + 1)
    if (nextCode === 33 || nextCode === 63 || (nextCode === 47 && !isAsciiAlphaCode(html.charCodeAt(start + 2)))) {
      // Doctypes and bogus comments both return to the data state at the
      // first greater-than sign. Real comments and CDATA are handled above.
      const end = html.indexOf('>', start + 2)
      if (end < 0)
        break
      cursor = end + 1
      continue
    }

    const tag = readTag(html, start, collectHead && (phase !== 'body'))
    if (!tag) {
      if (start + 1 >= html.length || nextCode === 47 || isAsciiAlphaCode(nextCode))
        break
      if (!scopes.length && !foreign.length)
        phase = 'body'
      cursor = start + 1
      continue
    }

    cursor = tag.end
    const { name, closing, selfClosing } = tag
    const foreignScope = parent?.context === 'html' ? parent.scope : -1
    const scopeName = parent ? foreign[foreignScope]?.name : scopes.at(-1)
    if (scopeName === 'select') {
      if (name === 'svg' && !closing) {
        const end = selfClosing ? cursor : closeSelectSvg(html, cursor)
        if (end === undefined)
          break
        cursor = end
        continue
      }
      const action = selectToken(name, closing)
      if (action === 'stop')
        break
      if (action === 'skip')
        continue
    }

    if (parent) {
      if (closing) {
        if (!closeForeignElement(foreign, name))
          break
      }
      else if (parent.context === 'html' || isHtmlIntegration(parent, name)) {
        if (DOCUMENT_SCOPES.has(name))
          break
        if (HEAD_TEXT.has(name) || BODY_TEXT.has(name)) {
          const close = closeTextElement(html, name, cursor)
          if (!close)
            break
          cursor = close.end
        }
        else if (name === 'svg' || name === 'math') {
          if (!selfClosing)
            foreign.push({ name, context: name })
        }
        else if (!VOID_HTML.has(name)) {
          foreign.push({ name, context: 'html', scope: SCOPED.has(name) ? foreign.length : foreignScope })
        }
      }
      else {
        const fontAttributes = name === 'font' ? tag.attributes : undefined
        if (HTML_IN_FOREIGN.has(name) || (fontAttributes
          && (hasOwn(fontAttributes, 'color') || hasOwn(fontAttributes, 'face') || hasOwn(fontAttributes, 'size')))) {
          break
        }
        if (!selfClosing) {
          const encoding = tag.attributes?.encoding
          const isAnnotation = parent.context === 'math' && name === 'annotation-xml'
            && encoding !== undefined && /^(?:text\/html|application\/xhtml\+xml)$/i.test(decodeAttribute(encoding))
          foreign.push({ name, context: isAnnotation ? 'math-html' : parent.context })
        }
      }
      continue
    }

    if (!closing && name === 'html' && phase === 'root') {
      result.root = tag
      phase = 'before-head'
      continue
    }
    if (!closing && name === 'head' && (phase === 'root' || phase === 'before-head')) {
      explicitHead = true
      phase = 'head'
      continue
    }
    if (!scopes.length && !closing && phase !== 'body' && (name === 'head' || name === 'html'))
      continue
    if (closing && name === 'head' && phase === 'head' && !scopes.length) {
      if (explicitHead)
        result.headClose = start
      phase = 'after-head'
      continue
    }
    if (!closing && name === 'body' && phase !== 'body' && !scopes.length) {
      result.body = tag
      phase = 'body'
      if (stopAtBody)
        break
      continue
    }

    if (!scopes.length && phase !== 'body' && !closing) {
      if (HEAD_VOID.has(name)) {
        phase = phase === 'after-head' ? phase : 'head'
        if (phase === 'head' && explicitHead && collectHead)
          result.headElements.push({ tag, start: textHasNonWs ? start : textStart })
        continue
      }
      if (HEAD_TEXT.has(name)) {
        const close = closeTextElement(html, name, cursor)
        if (!close)
          break
        cursor = close.end
        phase = phase === 'after-head' ? phase : 'head'
        if (phase === 'head' && explicitHead && collectHead)
          result.headElements.push({ tag, close, start: textHasNonWs ? start : textStart })
        continue
      }
    }

    if (!scopes.length && phase !== 'body' && name !== 'template') {
      if (closing && name !== 'body' && name !== 'html' && name !== 'br')
        continue
      phase = 'body'
    }

    if (closing && name === 'body' && !scopes.length && (result.body || resumeBodyEnd !== undefined)) {
      result.bodyClose = start
      break
    }
    if (!closing && (name === 'frameset' || name === 'plaintext'))
      break

    if (SCOPED.has(name)) {
      if (!closing) {
        if (name === 'template') {
          templateDepth++
          if (phase === 'root' || phase === 'before-head')
            phase = 'head'
        }
        scopes.push(name)
      }
      else {
        let scope = scopes.length - 1
        if (name === 'template') {
          // Closing a template also closes HTML scope barriers inside it.
          while (scope >= 0 && BODY_SCOPE_BARRIERS.has(scopes[scope]))
            scope--
        }
        if (scopes[scope] === name) {
          scopes.length = scope
          if (name === 'template')
            templateDepth--
        }
        else if (!BODY_SCOPE_BARRIERS.has(name)) {
          break
        }
      }
      continue
    }

    if (!closing && (name === 'svg' || name === 'math')) {
      if (!selfClosing)
        foreign.push({ name, context: name })
      continue
    }

    if (!closing && (HEAD_TEXT.has(name) || BODY_TEXT.has(name))) {
      const close = closeTextElement(html, name, cursor)
      if (!close)
        break
      cursor = close.end
    }
  }

  if (result.bodyClose === undefined)
    delete result.outlet
  return result
}

export interface StreamingHtmlTemplate extends PreparedHtmlTemplateWithIndexes {
  readonly headSlots?: HeadSlots
  readonly charset?: string
}

function readStreamingAttributes(raw: Record<string, string> | undefined, escapeAmpersands = true) {
  const attrs: Record<string, string> = {}
  for (const key in raw) {
    const value = decodeAttribute(raw[key])
    attrs[key] = escapeAmpersands ? value.replaceAll('&', '&amp;') : value
  }
  return attrs
}

/** Extract streaming metadata without moving static template markup. */
/* @__PURE__ */
export function parseHtmlForStreamingExtraction(template: string | PreparedTemplate): StreamingHtmlTemplate {
  const html = typeof template === 'string' ? template : template.html
  const prepared = typeof template !== 'string' ? template : undefined
  const { root, body, headElements, headClose, bodyClose, outlet, canAppendAtEnd } = scanTemplate(html, !!prepared, true)
  const indexes = prepared?.indexes ?? {
    htmlTagStart: root?.start ?? -1,
    htmlTagEnd: root?.end ?? -1,
    headTagEnd: headClose ?? -1,
    bodyTagStart: body?.start ?? -1,
    bodyTagEnd: body?.end ?? -1,
    bodyCloseTagStart: bodyClose ?? -1,
  }
  const input: SerializableHead = {}
  if (root) {
    const attrs = readStreamingAttributes(root.attributes, false)
    if (Object.keys(attrs).length)
      input.htmlAttrs = attrs
  }
  if (body) {
    const attrs = readStreamingAttributes(body.attributes, false)
    if (Object.keys(attrs).length)
      input.bodyAttrs = attrs
  }

  let ranges: HeadSlot[] | undefined
  let count = 0
  let charset: string | undefined
  if (indexes.headTagEnd >= 0) {
    for (const { tag, close } of headElements) {
      const attrs = readStreamingAttributes(tag.attributes)
      const kind = tag.name === 'title' && close
        ? 'title'
        : tag.name !== 'meta' || hasOwn(attrs, 'http-equiv')
          ? undefined
          : attrs.charset ? 'charset' : attrs.name === 'description' ? 'description' : undefined
      if (!kind)
        continue
      const slots = ranges ||= []
      const firstSlot = !slots.some(slot => slot.kind === kind)
      const offset = tag.start
      const end = close?.end ?? tag.end
      if (firstSlot)
        count++
      else
        slots.push({ kind: undefined, offset, end })
      if (kind === 'title') {
        const title = decodeAttribute(html.slice(tag.end, close!.start).replace(/\r\n?/g, '\n').replaceAll('\0', '\uFFFD'), false)
          .replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '')
        if (title)
          input.title ||= title
        if (firstSlot) {
          slots.push({
            kind,
            offset,
            end,
            openTag: Object.keys(attrs).length ? html.slice(offset, tag.end) : undefined,
            emptyMarkup: title ? undefined : html.slice(offset, end),
          })
        }
      }
      else {
        if (kind === 'charset' && !firstSlot)
          continue
        if (kind === 'charset')
          charset = attrs.charset
        ;(input.meta ||= []).push(attrs as unknown as NonNullable<SerializableHead['meta']>[number])
        if (firstSlot)
          slots.push({ kind, offset, end })
      }
    }
  }
  return {
    html,
    input,
    indexes,
    bodyOutlet: prepared ? prepared.bodyOutlet : outlet,
    canAppendAtEnd: prepared ? prepared.canAppendAtEnd : canAppendAtEnd,
    ...(ranges && { headSlots: { ranges, count }, charset }),
  }
}
