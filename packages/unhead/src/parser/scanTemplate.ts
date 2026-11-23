import { hasOwn } from '../utils/hasOwn'
import { decodeAttribute } from './decodeAttribute'

const WHITESPACE = /[\t\n\f\r ]*/y
const TAG_NAME = /<(\/?)([a-z][^\t\n\f\r /<>="'`]*)(?=[\t\n\f\r />])/iy
const ATTRIBUTE_NAME = /=[^\t\n\f\r /=>]*|[^\t\n\f\r /=>]+/y
const UNQUOTED_VALUE = /[^\t\n\f\r >]*/y
const COMMENT_END = /--!?>/g
const OUTLET = /^<!--\s*(?:app-html|ssr-outlet)\s*-->$/
const ASCII_ALPHA = /[a-z]/i
const TAG_DELIMITER = /[\t\n\f\r />]/
const ASCII_UPPER = /[A-Z]/g
const NON_WHITESPACE = /[^\t\n\f\r ]/

const HEAD_VOID = /* @__PURE__ */ new Set(['base', 'basefont', 'bgsound', 'link', 'meta'])
const HEAD_TEXT = /* @__PURE__ */ new Set(['title', 'style', 'script', 'noscript', 'noframes'])
const BODY_TEXT = /* @__PURE__ */ new Set(['textarea', 'xmp', 'iframe', 'noembed'])
const SCOPED = /* @__PURE__ */ new Set(['table', 'template', 'select'])
const SELECT_CONTENT = /* @__PURE__ */ new Set(['button', 'option', 'optgroup', 'hr', 'script', 'template', 'selectedcontent', 'span'])
const SVG_INTEGRATION = /* @__PURE__ */ new Set(['desc', 'foreignobject', 'title'])
const MATH_INTEGRATION = /* @__PURE__ */ new Set(['mi', 'mn', 'mo', 'ms', 'mtext'])
const VOID_HTML = /* @__PURE__ */ new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
const DOCUMENT_SCOPES = /* @__PURE__ */ new Set(['body', 'frameset', 'head', 'html', 'plaintext', 'select', 'table', 'template'])
const IMPLIED_END = /* @__PURE__ */ new Set(['dd', 'dt', 'li', 'optgroup', 'option', 'p', 'rb', 'rp', 'rt', 'rtc'])
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
  'font',
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

interface ForeignElement {
  name: string
  context: 'svg' | 'math' | 'math-html' | 'html'
}

export interface TemplateScan {
  root?: SourceTag
  body?: SourceTag
  bodyClose?: number
  headClose?: number
  outlet?: { start: number, end: number }
  headElements: HeadElement[]
}

function skipSpace(html: string, start: number) {
  WHITESPACE.lastIndex = start
  WHITESPACE.exec(html)
  return WHITESPACE.lastIndex
}

function asciiLower(value: string) {
  return value.replace(ASCII_UPPER, letter => letter.toLowerCase())
}

function readTag(html: string, start: number, collectAttributes = false): SourceTag | undefined {
  TAG_NAME.lastIndex = start
  const match = TAG_NAME.exec(html)
  if (!match)
    return

  const name = asciiLower(match[2])
  const closing = !!match[1]
  const attributes: Record<string, string> | undefined = !closing && (collectAttributes || name === 'annotation-xml') ? {} : undefined
  let cursor = TAG_NAME.lastIndex
  while (cursor < html.length) {
    cursor = skipSpace(html, cursor)
    const char = html[cursor]
    if (char === '>')
      return { name, start, end: cursor + 1, closing, selfClosing: false, attributes }
    if (char === '/') {
      if (html[cursor + 1] === '>')
        return { name, start, end: cursor + 2, closing, selfClosing: true, attributes }
      cursor++
      continue
    }

    ATTRIBUTE_NAME.lastIndex = cursor
    const nameMatch = ATTRIBUTE_NAME.exec(html)
    if (!nameMatch)
      return

    cursor = skipSpace(html, ATTRIBUTE_NAME.lastIndex)
    let value = ''
    if (html[cursor] === '=') {
      cursor = skipSpace(html, cursor + 1)
      const quote = html[cursor]
      if (quote === '"' || quote === '\'') {
        const end = html.indexOf(quote, cursor + 1)
        if (end < 0)
          return
        if (attributes)
          value = html.slice(cursor + 1, end)
        cursor = end + 1
      }
      else {
        UNQUOTED_VALUE.lastIndex = cursor
        const match = UNQUOTED_VALUE.exec(html)!
        if (attributes)
          value = match[0]
        cursor = UNQUOTED_VALUE.lastIndex
      }
    }

    if (attributes) {
      const key = asciiLower(nameMatch[0]).replaceAll('\0', '\uFFFD')
      if (key !== '__proto__' && !hasOwn(attributes, key))
        attributes[key] = value.replace(/\r\n?/g, '\n').replaceAll('\0', '\uFFFD')
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
  return TAG_DELIMITER.test(html[start + 6] ?? '') && asciiLower(html.slice(start, start + 6)) === 'script'
}

function closeScript(html: string, start: number) {
  let scriptData: 'normal' | 'escaped' | 'double-escaped' = 'normal'
  for (let cursor = start; cursor < html.length; cursor++) {
    if (scriptData !== 'normal' && html.startsWith('-->', cursor)) {
      scriptData = 'normal'
      cursor += 2
    }
    else if (html[cursor] !== '<') {
      continue
    }
    else if (html[cursor + 1] === '/' && matchesScriptName(html, cursor + 2)) {
      if (scriptData !== 'double-escaped')
        return readTag(html, cursor)
      scriptData = 'escaped'
      cursor += 7
    }
    else if (scriptData === 'normal' && html.startsWith('<!--', cursor)) {
      scriptData = 'escaped'
    }
    else if (scriptData === 'escaped' && matchesScriptName(html, cursor + 1)) {
      scriptData = 'double-escaped'
      cursor += 6
    }
  }
}

/** Find the actual end tag of an HTML text element. */
export function closeTextElement(html: string, name: string, start: number) {
  if (name === 'script')
    return closeScript(html, start)
  const pattern = new RegExp(`</${name}(?=[\\t\\n\\f\\r />])`, 'gi')
  pattern.lastIndex = start
  const close = pattern.exec(html)
  return close ? readTag(html, close.index) : undefined
}

function closeForeignElement(stack: ForeignElement[], name: string): boolean {
  let depth = stack.length
  if (CLOSES_IMPLIED_CHILDREN.has(name)) {
    while (depth > 0) {
      const current = stack[depth - 1]
      if (current.name === name || current.context !== 'html' || !IMPLIED_END.has(current.name))
        break
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
export function scanTemplate(html: string, stopAtBody: boolean, collectHead = false): TemplateScan {
  const result: TemplateScan = { headElements: [] }
  const foreign: ForeignElement[] = []
  const scopes: string[] = []
  let phase: 'root' | 'before-head' | 'head' | 'after-head' | 'body' = 'root'
  let explicitHead = false
  let templateDepth = 0
  let cursor = html.charCodeAt(0) === 0xFEFF ? 1 : 0

  while (cursor < html.length) {
    const start = html.indexOf('<', cursor)
    if (start < 0)
      break

    const text = html.slice(cursor, start)
    if (phase !== 'body' && !scopes.length && NON_WHITESPACE.test(text)
      && (!text.includes('&') || NON_WHITESPACE.test(decodeAttribute(text)))) {
      phase = 'body'
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

    const next = html[start + 1]
    if (next === '!' || next === '?' || (next === '/' && !ASCII_ALPHA.test(html[start + 2] ?? ''))) {
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
      if (next === '/' || ASCII_ALPHA.test(next ?? ''))
        break
      if (!scopes.length && !foreign.length)
        phase = 'body'
      cursor = start + 1
      continue
    }

    cursor = tag.end
    const { name, closing, selfClosing } = tag

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
          foreign.push({ name, context: 'html' })
        }
      }
      else {
        if (HTML_IN_FOREIGN.has(name))
          break
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
          result.headElements.push({ tag, start: NON_WHITESPACE.test(text) ? start : start - text.length })
        continue
      }
      if (HEAD_TEXT.has(name)) {
        const close = closeTextElement(html, name, cursor)
        if (!close)
          break
        cursor = close.end
        phase = phase === 'after-head' ? phase : 'head'
        if (phase === 'head' && explicitHead && collectHead)
          result.headElements.push({ tag, close, start: NON_WHITESPACE.test(text) ? start : start - text.length })
        continue
      }
    }

    if (!scopes.length && phase !== 'body' && name !== 'template') {
      if (closing && name !== 'body' && name !== 'html' && name !== 'br')
        continue
      phase = 'body'
    }

    if (closing && name === 'body' && !scopes.length) {
      if (result.body)
        result.bodyClose = start
      break
    }
    if (!closing && (name === 'frameset' || name === 'plaintext'))
      break

    // HTML can ignore starts inside a select or exit the select implicitly.
    // Leave later offsets unset if the source needs either recovery path.
    if (scopes.at(-1) === 'select' && (name === 'select' ? !closing : !SELECT_CONTENT.has(name)))
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
      else if (scopes.at(-1) === name) {
        scopes.pop()
        if (name === 'template')
          templateDepth--
      }
      else {
        break
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
