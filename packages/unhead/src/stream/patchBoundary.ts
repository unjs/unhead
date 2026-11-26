// Matches a special text/script tag name right after `<` (with optional `/`), followed by a delimiter.
const TEXT_TAG_RE = /^(\/?)(script|iframe|noembed|noframes|noscript|style|textarea|title|xmp)(?=[\t\n\f\r />])/i
const COMMENT_END_RE = /--!?>/g
// Longest text-element tag token (`</textarea` + delimiter = 11 chars).
const TAIL_LENGTH = 11

const OUTSIDE = 0
const DATA = 1
const ESCAPED = 2
const DOUBLE_ESCAPED = 3

function isTagDelimCode(c: number): boolean {
  return c === 62 || c === 32 || c === 47 || c === 10 || c === 9 || c === 13 || c === 12
}

function isAsciiAlphaCode(c: number): boolean {
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90)
}

function matchesScriptName(html: string, start: number): boolean {
  return isTagDelimCode(html.charCodeAt(start + 6))
    && (html.charCodeAt(start) | 32) === 115
    && (html.charCodeAt(start + 1) | 32) === 99
    && (html.charCodeAt(start + 2) | 32) === 114
    && (html.charCodeAt(start + 3) | 32) === 105
    && (html.charCodeAt(start + 4) | 32) === 112
    && (html.charCodeAt(start + 5) | 32) === 116
}

function findCloseTextTag(html: string, name: string, start: number): number {
  const nlen = name.length
  let pos = start
  while (true) {
    const idx = html.indexOf('</', pos)
    if (idx < 0)
      return -1
    if (isTagDelimCode(html.charCodeAt(idx + 2 + nlen))) {
      let match = true
      for (let i = 0; i < nlen; i++) {
        if ((html.charCodeAt(idx + 2 + i) | 32) !== name.charCodeAt(i)) {
          match = false
          break
        }
      }
      if (match)
        return idx
    }
    pos = idx + 2
  }
}

/**
 * Track whether streamed app HTML ends where a late head patch can go.
 *
 * A patch is an inline script, and its end tag would close an app script early. Script
 * tracking changes at completed tags and ignores tokens inside quoted attributes.
 * Waiting inside text elements and comments keeps the patch out of visible text.
 *
 * Returns `true` when the HTML so far ends outside those contexts.
 */
export function createPatchBoundary(): (text: string) => boolean {
  let tail = ''
  let script = OUTSIDE
  let text: string | undefined
  let comment = false
  let inPending = false
  let pendingName: string | undefined
  let pendingClosing = false
  let pendingQuote = 0 // 0, 34 ('"'), or 39 ("'")

  return (chunk) => {
    const html = tail ? tail + chunk : chunk
    const len = html.length
    let i = 0

    while (i < len) {
      if (inPending) {
        if (pendingQuote) {
          const end = html.indexOf(pendingQuote === 34 ? '"' : '\'', i)
          if (end < 0) {
            i = len
            break
          }
          pendingQuote = 0
          i = end + 1
          continue
        }
        let closed = false
        while (i < len) {
          const c = html.charCodeAt(i)
          if (c === 62) { // '>'
            if (pendingName === 'script')
              script = pendingClosing ? OUTSIDE : DATA
            else if (pendingName)
              text = pendingClosing ? undefined : pendingName
            inPending = false
            pendingName = undefined
            pendingClosing = false
            i++
            closed = true
            break
          }
          if (c === 34 || c === 39) {
            pendingQuote = c
            i++
            closed = true
            break
          }
          i++
        }
        if (!closed)
          break
        continue
      }

      if (script !== OUTSIDE) {
        if (script === DATA) {
          const lt = html.indexOf('<', i)
          if (lt < 0) {
            i = len
            break
          }
          const c1 = html.charCodeAt(lt + 1)
          if (c1 === 47 && matchesScriptName(html, lt + 2)) {
            inPending = true
            pendingName = 'script'
            pendingClosing = true
            i = lt + 8
            continue
          }
          if (c1 === 33 && html.charCodeAt(lt + 2) === 45 && html.charCodeAt(lt + 3) === 45) {
            script = ESCAPED
            i = lt + 4
            continue
          }
          if (len - lt < 9) {
            i = lt
            break
          }
          i = lt + 1
          continue
        }
        else {
          const lt = html.indexOf('<', i)
          const dash = html.indexOf('-->', i)
          if (dash >= 0 && (lt < 0 || dash < lt)) {
            script = DATA
            i = dash + 3
            continue
          }
          if (lt >= 0) {
            const c1 = html.charCodeAt(lt + 1)
            if (c1 === 47 && matchesScriptName(html, lt + 2)) {
              if (script !== DOUBLE_ESCAPED) {
                inPending = true
                pendingName = 'script'
                pendingClosing = true
              }
              else {
                script = ESCAPED
              }
              i = lt + 8
              continue
            }
            if (script === ESCAPED && matchesScriptName(html, lt + 1)) {
              script = DOUBLE_ESCAPED
              i = lt + 7
              continue
            }
            if (len - lt < 9) {
              i = lt
              break
            }
            i = lt + 1
            continue
          }
          i = Math.max(i, len - 2)
          break
        }
      }

      if (text) {
        const idx = findCloseTextTag(html, text, i)
        if (idx < 0) {
          const lastLt = html.lastIndexOf('<')
          i = lastLt >= i && len - lastLt < text.length + 3 ? lastLt : len
          break
        }
        inPending = true
        pendingName = text
        pendingClosing = true
        i = idx + 2 + text.length
        continue
      }

      if (comment) {
        COMMENT_END_RE.lastIndex = i
        if (!COMMENT_END_RE.test(html)) {
          i = Math.max(i, len - 3)
          break
        }
        comment = false
        i = COMMENT_END_RE.lastIndex
        continue
      }

      // OUTSIDE: skip straight to the next `<`, ignoring quotes and `>` in text.
      const lt = html.indexOf('<', i)
      if (lt < 0) {
        i = len
        break
      }
      if (lt + 1 >= len) {
        i = lt
        break
      }
      const c1 = html.charCodeAt(lt + 1)
      if (c1 === 33 && html.charCodeAt(lt + 2) === 45 && html.charCodeAt(lt + 3) === 45) {
        comment = true
        i = lt + 4
        continue
      }
      const isAlpha = isAsciiAlphaCode(c1)
      const isSlash = c1 === 47
      if (!isAlpha && !isSlash && c1 !== 33 && c1 !== 63) {
        i = lt + 1
        continue
      }
      // Hold an incomplete `<...` tag prefix at chunk end until a delimiter or `>` arrives.
      if (len - lt < TAIL_LENGTH && !html.includes('>', lt + 1)) {
        if (c1 === 33) {
          if (len - lt < 4) {
            i = lt
            break
          }
        }
        else if (isAlpha || isSlash) {
          const m = TEXT_TAG_RE.exec(html.slice(lt + 1, lt + TAIL_LENGTH))
          if (m) {
            inPending = true
            pendingName = m[2].toLowerCase()
            pendingClosing = !!m[1]
            i = lt + 1 + m[0].length
            continue
          }
          // Wait if the tag name itself has not hit whitespace or `/` yet.
          let k = lt + 1 + (isSlash ? 1 : 0)
          while (k < len && isAsciiAlphaCode(html.charCodeAt(k)))
            k++
          if (k === len) {
            i = lt
            break
          }
        }
      }
      if (isAlpha || isSlash) {
        const m = TEXT_TAG_RE.exec(html.slice(lt + 1, lt + TAIL_LENGTH))
        if (m) {
          inPending = true
          pendingName = m[2].toLowerCase()
          pendingClosing = !!m[1]
          i = lt + 1 + m[0].length
          continue
        }
      }
      inPending = true
      pendingName = undefined
      pendingClosing = false
      i = lt + 2
    }

    tail = i < len ? html.slice(i) : ''
    return script === OUTSIDE && !text && !comment && !inPending && tail.length === 0
  }
}
