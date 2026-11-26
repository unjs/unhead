const JS_NEED_RE = /[\s/]/
const JS_LINETERM_RE = /[\n\r\u2028\u2029]/

/**
 * Lightweight JS minifier in pure JS (no native deps).
 * Keeps uncertain syntax unchanged instead of guessing its lexical context.
 */
export function minifyJS(code: string): string {
  if (!JS_NEED_RE.test(code))
    return code

  // HTML comments have line-sensitive rules outside this scanner's scope.
  if (code.includes('<!--') || code.includes('-->'))
    return code

  let result = ''
  // Track the last emitted character code (-1 = none) so we never flatten the growing rope.
  let lastCode = -1
  let separator = 0 // 0=none, 1=' ', 2='\n'
  let i = 0
  let segStart = 0
  const len = code.length

  while (i < len) {
    const c = code.charCodeAt(i)
    // Comments act as token separators. Block comments can also carry ASI.
    if (isWhitespace(c) || (c === 47 && (code.charCodeAt(i + 1) === 47 || code.charCodeAt(i + 1) === 42))) {
      if (i > segStart) {
        result += code.slice(segStart, i)
        lastCode = code.charCodeAt(i - 1)
      }
      let hasNewline = false
      if (c === 47) {
        if (code.charCodeAt(i + 1) === 47) {
          i += 2
          while (i < len && !isLineTerminator(code.charCodeAt(i)))
            i++
          if (i < len)
            hasNewline = true
        }
        else {
          const end = code.indexOf('*/', i + 2)
          if (end === -1)
            return code
          if (JS_LINETERM_RE.test(code.slice(i + 2, end)))
            hasNewline = true
          i = end + 2
        }
      }
      else {
        while (i < len) {
          const w = code.charCodeAt(i)
          if (!isWhitespace(w))
            break
          if (!hasNewline && isLineTerminator(w))
            hasNewline = true
          i++
        }
      }
      if (hasNewline)
        separator = 2
      else if (separator === 0)
        separator = 1
      segStart = i
      continue
    }

    // A slash needs parser context to distinguish division from a regex.
    // Templates need recursive expression lexing. Escaped identifiers also
    // need token decoding. Leave the entire input intact in these cases.
    if (c === 47 || c === 96 || c === 92)
      return code

    if (separator && lastCode >= 0) {
      if (separator === 2) {
        result += '\n'
        lastCode = 10
      }
      else if ((isIdentChar(lastCode) && isIdentChar(c))
        || (lastCode >= 48 && lastCode <= 57 && c === 46)
        || (isOperatorChar(lastCode) && isOperatorChar(c))) {
        result += ' '
        lastCode = 32
      }
    }
    separator = 0

    if (c === 39 || c === 34) {
      const q = c === 39 ? '\'' : '"'
      i++
      while (true) {
        const end = code.indexOf(q, i)
        if (end === -1)
          return code
        let bs = end - 1
        while (bs >= i && code.charCodeAt(bs) === 92)
          bs--
        if (((end - 1 - bs) & 1) === 0) {
          i = end + 1
          break
        }
        i = end + 1
      }
      lastCode = c
    }
    else {
      lastCode = c
      i++
    }
  }

  if (len > segStart)
    result += code.slice(segStart, len)

  return result.trim()
}

function isWhitespace(c: number): boolean {
  // Most source is ASCII. Keep the full Unicode rule for non-ASCII input.
  return c === 32 || (c >= 9 && c <= 13) || (c >= 0x80 && /\s/.test(String.fromCharCode(c)))
}

function isLineTerminator(c: number): boolean {
  return c === 10 || c === 13 || c === 0x2028 || c === 0x2029
}

function isIdentChar(c: number): boolean {
  // Conservatively include every non-ASCII code unit, including surrogates.
  return (c >= 97 && c <= 122)
    || (c >= 65 && c <= 90)
    || (c >= 48 && c <= 57)
    || c === 95
    || c === 36
    || c >= 0x80
}

function isOperatorChar(c: number): boolean {
  return c === 43 || c === 45 || c === 42 || c === 61 || c === 33 || c === 60 || c === 62 || c === 63 || c === 38 || c === 124 || c === 94 || c === 126 || c === 37 || c === 46
}
