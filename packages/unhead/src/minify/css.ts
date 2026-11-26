const CSS_GUARD_RE = /url\(|\\|--/i
const CSS_NEED_RE = /[ \t\n\f\r/]|;\}|0\.\d/

/**
 * Lightweight CSS minifier in pure JS (no native deps).
 * Strips comments and collapses whitespace while preserving string literals.
 */
export function minifyCSS(code: string): string {
  // URLs, escapes and custom property token streams need a full CSS lexer.
  // Preserve the whole input rather than rewrite their contents.
  if (CSS_GUARD_RE.test(code))
    return code

  if (!CSS_NEED_RE.test(code))
    return code

  let result = ''
  // Track the last emitted character code (-1 = none) so U+0000 is not mistaken for absence.
  let lastCode = -1
  let i = 0
  let segStart = 0
  let parenDepth = 0
  const len = code.length

  while (i < len) {
    const c = code.charCodeAt(i)
    // string literals - preserve as-is
    if (c === 39 || c === 34) {
      // The whole-input escape guard makes the next quote the closing quote.
      const end = code.indexOf(c === 39 ? '\'' : '"', i + 1)
      if (end === -1)
        return code
      lastCode = c
      i = end + 1
    }
    // comments
    else if (c === 47 && code.charCodeAt(i + 1) === 42) {
      const end = code.indexOf('*/', i + 2)
      if (end === -1)
        return code
      if (i > segStart) {
        result += code.slice(segStart, i)
        lastCode = code.charCodeAt(i - 1)
      }
      i = end + 2
      const next = i < len ? code.charCodeAt(i) : -1
      // An empty comment keeps adjacent tokens separate without a combinator.
      if (lastCode >= 0 && !isCSSWhitespace(lastCode) && next >= 0 && !isCSSWhitespace(next)) {
        result += '/**/'
        lastCode = 47
      }
      segStart = i
    }
    // track paren depth for calc()/min()/max()/clamp()/var()
    else if (c === 40) {
      parenDepth++
      lastCode = 40
      i++
    }
    else if (c === 41) {
      if (parenDepth > 0)
        parenDepth--
      lastCode = 41
      i++
    }
    // whitespace - collapse to single space, remove around punctuation
    else if (isCSSWhitespace(c)) {
      if (i > segStart) {
        result += code.slice(segStart, i)
        lastCode = code.charCodeAt(i - 1)
      }
      while (i < len && isCSSWhitespace(code.charCodeAt(i)))
        i++
      const next = i < len ? code.charCodeAt(i) : -1
      // strip space before ! for !important
      if (next !== 33) {
        if (parenDepth > 0) {
          // Function arguments can contain selectors as well as calculations.
          if (lastCode >= 0 && next >= 0 && lastCode !== 40 && next !== 41 && lastCode !== 44 && next !== 44) {
            result += ' '
            lastCode = 32
          }
        }
        else if (lastCode >= 0 && next >= 0 && !isCSSPunctuation(lastCode) && lastCode !== 58 && lastCode !== 40 && !isCSSPunctuation(next)) {
          result += ' '
          lastCode = 32
        }
      }
      segStart = i
    }
    // trailing semicolon before } is optional
    else if (c === 59) {
      let j = i + 1
      while (j < len && isCSSWhitespace(code.charCodeAt(j)))
        j++
      if (j < len && code.charCodeAt(j) === 125) {
        if (i > segStart) {
          result += code.slice(segStart, i)
          lastCode = code.charCodeAt(i - 1)
        }
        i++ // skip the semicolon
        segStart = i
      }
      else {
        lastCode = 59
        i++
      }
    }
    // leading zero: 0.x -> .x
    else if (c === 48 && code.charCodeAt(i + 1) === 46) {
      const c2 = code.charCodeAt(i + 2)
      if (c2 >= 48 && c2 <= 57) {
        const prev = i > segStart ? code.charCodeAt(i - 1) : lastCode
        // Only rewrite a number at a value boundary, never an identifier.
        if (prev < 0 || prev === 58 || prev === 40 || prev === 44 || isCSSWhitespace(prev)) {
          if (i > segStart) {
            result += code.slice(segStart, i)
            lastCode = code.charCodeAt(i - 1)
          }
          i++ // skip the 0, the . will be picked up next iteration
          segStart = i
          continue
        }
      }
      lastCode = 48
      i++
    }
    else {
      lastCode = c
      i++
    }
  }

  if (len > segStart) {
    result += code.slice(segStart, len)
    lastCode = code.charCodeAt(len - 1)
  }

  // Only collapsed spaces before trailing comments can remain.
  if (lastCode === 32) {
    let end = result.length - 1
    while (result.charCodeAt(end - 1) === 32)
      end--
    return result.slice(0, end)
  }
  // Copy the output so quoted slices cannot retain the entire source.
  return `${result} `.slice(0, -1)
}

function isCSSWhitespace(c: number): boolean {
  return c === 32 || c === 9 || c === 10 || c === 12 || c === 13
}

function isCSSPunctuation(c: number): boolean {
  return c === 123 || c === 125 || c === 59 || c === 44 || c === 62 || c === 126 || c === 43
}
