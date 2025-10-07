import type { SerializableHead } from '../types'

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
const LT_CHAR = 60 // '<'
const GT_CHAR = 62 // '>'
const SLASH_CHAR = 47 // '/'
const EQUALS_CHAR = 61 // '='
const QUOTE_CHAR = 34 // '"'
const APOS_CHAR = 39 // '\''
const EXCLAMATION_CHAR = 33 // '!'
const BACKSLASH_CHAR = 92 // '\'
const DASH_CHAR = 45 // '-'

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
}

/**
 * Fast whitespace check using direct character code comparison
 */
function isWhitespace(charCode: number): boolean {
  return charCode === 32 // SPACE_CHAR
    || charCode === 9 // TAB_CHAR
    || charCode === 10 // NEWLINE_CHAR
    || charCode === 13 // CARRIAGE_RETURN_CHAR
}

/**
 * Process HTML comment or doctype
 */
function processCommentOrDoctype(htmlChunk: string, position: number): {
  complete: boolean
  newPosition: number
  remainingText: string
} {
  let i = position
  const chunkLength = htmlChunk.length

  // Check for comment start
  if (i + 3 < chunkLength
    && htmlChunk.charCodeAt(i + 2) === DASH_CHAR
    && htmlChunk.charCodeAt(i + 3) === DASH_CHAR) {
    i += 4 // Skip past '<!--'

    // Look for --> sequence
    while (i < chunkLength - 2) {
      if (htmlChunk.charCodeAt(i) === DASH_CHAR
        && htmlChunk.charCodeAt(i + 1) === DASH_CHAR
        && htmlChunk.charCodeAt(i + 2) === GT_CHAR) {
        i += 3
        return {
          complete: true,
          newPosition: i,
          remainingText: '',
        }
      }
      i++
    }

    return {
      complete: false,
      newPosition: position,
      remainingText: htmlChunk.substring(position),
    }
  }
  else {
    i += 2 // Skip past '<!'

    while (i < chunkLength) {
      if (htmlChunk.charCodeAt(i) === GT_CHAR) {
        i++
        return {
          complete: true,
          newPosition: i,
          remainingText: '',
        }
      }
      i++
    }

    return {
      complete: false,
      newPosition: i,
      remainingText: htmlChunk.substring(position, i),
    }
  }
}

/**
 * Parse HTML attributes string into key-value object
 */
/* @__PURE__ */
export function parseAttributes(attrStr: string): Record<string, string> {
  if (!attrStr)
    return {}

  const result: Record<string, string> = {}
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
          result[name] = ''
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
        if (charCode === BACKSLASH_CHAR && i + 1 < len) {
          i++
        }
        else if (charCode === quoteChar) {
          result[name] = attrStr.substring(valueStart, i)
          state = WHITESPACE
        }
        break

      case UNQUOTED_VALUE:
        if (isSpace || charCode === GT_CHAR) {
          result[name] = attrStr.substring(valueStart, i)
          state = WHITESPACE
        }
        break
    }

    i++
  }

  // Handle the last attribute
  if (state === QUOTED_VALUE || state === UNQUOTED_VALUE) {
    if (name) {
      result[name] = attrStr.substring(valueStart, i)
    }
  }
  else if (state === NAME || state === AFTER_NAME || state === BEFORE_VALUE) {
    nameEnd = nameEnd || i
    const currentName = attrStr.substring(nameStart, nameEnd).toLowerCase()
    if (currentName) {
      result[currentName] = ''
    }
  }

  return result
}

/**
 * Parse HTML to find tag indexes without extracting head elements
 * Used for transformHtmlTemplateRaw where we don't want to extract existing head content
 */
/* @__PURE__ */
export function parseHtmlForIndexes(html: string): PreparedHtmlTemplateWithIndexes {
  const indexes = {
    htmlTagStart: html.indexOf('<html'),
    htmlTagEnd: -1,
    headTagEnd: html.indexOf('</head>'),
    bodyTagStart: html.indexOf('<body'),
    bodyTagEnd: -1,
    bodyCloseTagStart: html.indexOf('</body>'),
  }

  // Find the end of the html tag
  if (indexes.htmlTagStart >= 0) {
    const htmlTagEndPos = html.indexOf('>', indexes.htmlTagStart)
    if (htmlTagEndPos >= 0) {
      indexes.htmlTagEnd = htmlTagEndPos + 1
    }
  }

  // Find the end of the body tag
  if (indexes.bodyTagStart >= 0) {
    const bodyTagEndPos = html.indexOf('>', indexes.bodyTagStart)
    if (bodyTagEndPos >= 0) {
      indexes.bodyTagEnd = bodyTagEndPos + 1
    }
  }

  return { html, input: {}, indexes }
}

/* @__PURE__ */
export function parseHtmlForUnheadExtraction(html: string): PreparedHtmlTemplateWithIndexes {
  const input = {} as SerializableHead
  const htmlParts: string[] = []
  let position = 0
  let inHead = false
  let foundBodyStart = false
  let lastCopyPosition = 0
  let currentOutputLength = 0

  // Track indexes for efficient replacement
  const indexes = {
    htmlTagStart: -1,
    htmlTagEnd: -1,
    headTagEnd: -1,
    bodyTagStart: -1,
    bodyTagEnd: -1,
    bodyCloseTagStart: -1,
  }

  // Track which elements we're extracting from head
  const headElementsToExtract = new Set([TAG_TITLE, TAG_META, TAG_LINK, TAG_SCRIPT, TAG_STYLE, TAG_BASE])

  // Helper function to copy accumulated text and update indexes
  function copyAccumulatedText() {
    if (lastCopyPosition < position) {
      const textToAdd = html.substring(lastCopyPosition, position)
      htmlParts.push(textToAdd)
      currentOutputLength += textToAdd.length
      lastCopyPosition = position
    }
  }

  // Helper function to add text and update index tracking
  function addText(text: string) {
    htmlParts.push(text)
    currentOutputLength += text.length
  }

  while (position < html.length && !foundBodyStart) {
    const currentCharCode = html.charCodeAt(position)

    if (currentCharCode !== LT_CHAR) {
      position++
      continue
    }

    // Look ahead to determine tag type
    if (position + 1 >= html.length) {
      copyAccumulatedText()
      addText(html[position])
      break
    }

    const nextCharCode = html.charCodeAt(position + 1)

    // Handle comments and doctype - pass through
    if (nextCharCode === EXCLAMATION_CHAR) {
      const result = processCommentOrDoctype(html, position)
      if (result.complete) {
        copyAccumulatedText()
        addText(html.substring(position, result.newPosition))
        position = result.newPosition
        lastCopyPosition = position
      }
      else {
        copyAccumulatedText()
        addText(html.substring(position))
        break
      }
      continue
    }

    // Handle closing tags
    if (nextCharCode === SLASH_CHAR) {
      let tagEnd = position + 2
      while (tagEnd < html.length && html.charCodeAt(tagEnd) !== GT_CHAR) {
        tagEnd++
      }

      if (tagEnd >= html.length) {
        copyAccumulatedText()
        addText(html.substring(position))
        break
      }

      const tagName = html.substring(position + 2, tagEnd).toLowerCase().trim()
      const tagId = TagIdMap[tagName as keyof typeof TagIdMap] ?? -1

      if (tagId === TAG_HEAD) {
        inHead = false
        // Track the end of head tag for injection point
        copyAccumulatedText()
        const headCloseStart = currentOutputLength
        addText(html.substring(position, tagEnd + 1))
        indexes.headTagEnd = headCloseStart
      }
      else {
        // Always include other closing tags in output
        copyAccumulatedText()
        addText(html.substring(position, tagEnd + 1))
      }
      position = tagEnd + 1
      lastCopyPosition = position
      continue
    }

    // Handle opening tags
    const tagStart = position + 1
    let tagNameEnd = tagStart

    // Find end of tag name
    while (tagNameEnd < html.length) {
      const c = html.charCodeAt(tagNameEnd)
      if (isWhitespace(c) || c === SLASH_CHAR || c === GT_CHAR) {
        break
      }
      tagNameEnd++
    }

    if (tagNameEnd >= html.length) {
      copyAccumulatedText()
      addText(html.substring(position))
      break
    }

    const tagName = html.substring(tagStart, tagNameEnd).toLowerCase()
    const tagId = TagIdMap[tagName as keyof typeof TagIdMap] ?? -1

    // Find the end of the complete tag (including attributes and '>')
    let tagEnd = tagNameEnd
    let inQuote = false
    let quoteChar = 0
    let foundEnd = false
    let isSelfClosing = false

    while (tagEnd < html.length && !foundEnd) {
      const c = html.charCodeAt(tagEnd)

      if (inQuote) {
        if (c === quoteChar) {
          inQuote = false
        }
      }
      else if (c === QUOTE_CHAR || c === APOS_CHAR) {
        inQuote = true
        quoteChar = c
      }
      else if (c === SLASH_CHAR && tagEnd + 1 < html.length && html.charCodeAt(tagEnd + 1) === GT_CHAR) {
        isSelfClosing = true
        tagEnd += 2
        foundEnd = true
        continue
      }
      else if (c === GT_CHAR) {
        tagEnd++
        foundEnd = true
        continue
      }
      tagEnd++
    }

    if (!foundEnd) {
      copyAccumulatedText()
      addText(html.substring(position))
      break
    }

    // Extract attributes from the tag
    const attributesStr = html.substring(tagNameEnd, tagEnd - (isSelfClosing ? 2 : 1)).trim()
    const attributes = parseAttributes(attributesStr)

    // Handle specific tags
    if (tagId === TAG_HTML) {
      copyAccumulatedText()
      indexes.htmlTagStart = currentOutputLength
      if (Object.keys(attributes).length > 0) {
        input.htmlAttrs = attributes
        // Remove attributes from HTML tag
        addText(`<${tagName}>`)
      }
      else {
        addText(html.substring(position, tagEnd))
      }
      indexes.htmlTagEnd = currentOutputLength
    }
    else if (tagId === TAG_BODY) {
      copyAccumulatedText()
      indexes.bodyTagStart = currentOutputLength
      if (Object.keys(attributes).length > 0) {
        input.bodyAttrs = attributes
        addText(`<${tagName}>`)
      }
      else {
        addText(html.substring(position, tagEnd))
      }
      indexes.bodyTagEnd = currentOutputLength
      foundBodyStart = true
      position = tagEnd
      lastCopyPosition = position
      break
    }
    else if (tagId === TAG_HEAD) {
      inHead = true
      copyAccumulatedText()
      addText(html.substring(position, tagEnd))
    }
    else if (inHead && headElementsToExtract.has(tagId)) {
      // Extract head elements and don't include them in output
      if (tagId === TAG_TITLE) {
        // Extract title content if not self-closing
        if (!isSelfClosing) {
          const titleEnd = findClosingTag(html, tagEnd, tagName)
          if (titleEnd !== -1) {
            const titleContent = html.substring(tagEnd, titleEnd).trim()
            if (titleContent && !input.title) {
              input.title = titleContent
            }
            position = findTagEnd(html, titleEnd, tagName)
            lastCopyPosition = position
            continue
          }
        }
      }
      else if (tagId === TAG_SCRIPT) {
        const scriptAttrs = { ...attributes }
        if (!isSelfClosing) {
          const scriptEnd = findClosingTag(html, tagEnd, tagName)
          if (scriptEnd !== -1) {
            const scriptContent = html.substring(tagEnd, scriptEnd)
            scriptAttrs.innerHTML = scriptContent || ''
            position = findTagEnd(html, scriptEnd, tagName)
          }
          else {
            scriptAttrs.innerHTML = ''
            position = tagEnd
          }
        }
        else {
          scriptAttrs.innerHTML = ''
          position = tagEnd
        }
        lastCopyPosition = position
        ;(input.script ||= []).push(scriptAttrs)
        continue
      }
      else if (tagId === TAG_STYLE) {
        const styleAttrs = { ...attributes }
        if (!isSelfClosing) {
          const styleEnd = findClosingTag(html, tagEnd, tagName)
          if (styleEnd !== -1) {
            const styleContent = html.substring(tagEnd, styleEnd)
            styleAttrs.textContent = styleContent || ''
            position = findTagEnd(html, styleEnd, tagName)
          }
          else {
            styleAttrs.textContent = ''
            position = tagEnd
          }
        }
        else {
          styleAttrs.textContent = ''
          position = tagEnd
        }
        lastCopyPosition = position
        ;(input.style ||= []).push(styleAttrs)
        continue
      }
      else if (tagId === TAG_META) {
        ;(input.meta ||= []).push(attributes)
        position = tagEnd
        lastCopyPosition = position
        continue
      }
      else if (tagId === TAG_LINK) {
        ;(input.link ||= []).push(attributes)
        position = tagEnd
        lastCopyPosition = position
        continue
      }
      else if (tagId === TAG_BASE && !input.base) {
        input.base = attributes
        position = tagEnd
        lastCopyPosition = position
        continue
      }
    }
    else {
      // Include all other tags in output
      copyAccumulatedText()
      addText(html.substring(position, tagEnd))
    }

    position = tagEnd
    lastCopyPosition = position
  }

  // Continue processing to find the closing body tag
  const remainingHtml = html.substring(position)
  const bodyCloseIndex = remainingHtml.indexOf('</body>')

  if (bodyCloseIndex !== -1) {
    indexes.bodyCloseTagStart = currentOutputLength + bodyCloseIndex
  }

  // Append the rest of the HTML
  copyAccumulatedText()
  addText(remainingHtml)

  return { html: htmlParts.join(''), input, indexes }
}

/**
 * Find the closing tag for a given tag name
 * For script and style tags, this handles quotes to avoid matching closing tags inside string literals
 */
function findClosingTag(html: string, startPos: number, tagName: string): number {
  const tagId = TagIdMap[tagName as keyof typeof TagIdMap]
  const isScriptOrStyle = tagId === TAG_SCRIPT || tagId === TAG_STYLE

  if (!isScriptOrStyle) {
    // Simple search for non-script/style tags
    const closingTag = `</${tagName}`
    const index = html.indexOf(closingTag, startPos)
    return index === -1 ? -1 : index
  }

  // Quote-aware search for script and style tags
  const closingTag = `</${tagName}`
  let pos = startPos
  let inSingleQuote = false
  let inDoubleQuote = false
  let inBacktick = false
  let lastCharWasBackslash = false

  while (pos < html.length) {
    const currentCharCode = html.charCodeAt(pos)

    // Handle quote state transitions (only if not escaped)
    if (!lastCharWasBackslash) {
      if (currentCharCode === APOS_CHAR && !inDoubleQuote && !inBacktick) {
        inSingleQuote = !inSingleQuote
      }
      else if (currentCharCode === QUOTE_CHAR && !inSingleQuote && !inBacktick) {
        inDoubleQuote = !inDoubleQuote
      }
      else if (currentCharCode === 96 && !inSingleQuote && !inDoubleQuote) { // backtick
        inBacktick = !inBacktick
      }
    }

    // Track escape character state
    lastCharWasBackslash = currentCharCode === BACKSLASH_CHAR && !lastCharWasBackslash

    // Check for closing tag only when not inside quotes
    const inQuotes = inSingleQuote || inDoubleQuote || inBacktick
    if (!inQuotes && html.startsWith(closingTag, pos)) {
      // Verify it's a complete tag (followed by whitespace or >)
      const afterTagPos = pos + closingTag.length
      if (afterTagPos >= html.length) {
        return pos
      }
      const nextChar = html.charCodeAt(afterTagPos)
      if (nextChar === GT_CHAR || isWhitespace(nextChar)) {
        return pos
      }
    }

    pos++
  }

  return -1
}

/**
 * Find the end of a closing tag (after the '>')
 */
function findTagEnd(html: string, closingTagStart: number, tagName: string): number {
  let pos = closingTagStart + tagName.length + 2 // Skip '</' and tag name
  while (pos < html.length && html.charCodeAt(pos) !== GT_CHAR) {
    pos++
  }
  return pos < html.length ? pos + 1 : pos
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
    parts.push(html.substring(lastIndex, indexes.headTagEnd))
    parts.push(headHtml.headTags)
    parts.push('</head>')
    lastIndex = indexes.headTagEnd + 7 // Skip past '</head>'
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
  if (indexes.bodyCloseTagStart >= 0) {
    parts.push(html.substring(lastIndex, indexes.bodyCloseTagStart))
    parts.push(headHtml.bodyTags)
    parts.push(html.substring(indexes.bodyCloseTagStart))
  }
  else {
    // No closing body tag found, just append the rest
    parts.push(html.substring(lastIndex))
  }

  return parts.join('')
}
