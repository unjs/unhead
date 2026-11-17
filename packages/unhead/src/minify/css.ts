/**
 * Lightweight CSS minifier in pure JS (no native deps).
 * Strips comments and collapses whitespace while preserving string literals.
 */
export function minifyCSS(code: string): string {
  // URLs, escapes and custom property token streams need a full CSS lexer.
  // Preserve the whole input rather than rewrite their contents.
  if (/url\(|\\|--/i.test(code))
    return code

  if (!/[ \t\n\f\r/]|;\}|0\.\d/.test(code))
    return code

  let result = ''
  // Reading the growing result forces V8 to repeatedly flatten its string rope.
  let last = ''
  let i = 0
  let parenDepth = 0
  const len = code.length
  const append = (value: string) => {
    result += value
    last = value
  }

  while (i < len) {
    const ch = code[i]
    // string literals - preserve as-is
    if (ch === '\'' || ch === '"') {
      // The whole-input escape guard makes the next quote the closing quote.
      const end = code.indexOf(ch, i + 1)
      if (end === -1)
        return code
      result += code.slice(i, end + 1)
      last = ch
      i = end + 1
    }
    // comments
    else if (ch === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2)
      if (end === -1)
        return code
      i = end + 2
      // An empty comment keeps adjacent tokens separate without a combinator.
      if (last && !isCSSWhitespace(last) && code[i] && !isCSSWhitespace(code[i])) {
        result += '/**/'
        last = '/'
      }
    }
    // track paren depth for calc()/min()/max()/clamp()/var()
    else if (ch === '(') {
      parenDepth++
      append(ch)
      i++
    }
    else if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
      append(ch)
      i++
    }
    // whitespace - collapse to single space, remove around punctuation
    else if (isCSSWhitespace(ch!)) {
      while (i < len && isCSSWhitespace(code[i]))
        i++
      const next = code[i]
      // strip space before ! for !important
      if (next === '!')
        continue
      if (parenDepth > 0) {
        // Function arguments can contain selectors as well as calculations.
        if (last && next && last !== '(' && next !== ')' && last !== ',' && next !== ',')
          append(' ')
      }
      else if (last && next && !isCSSPunctuation(last) && last !== ':' && last !== '(' && !isCSSPunctuation(next)) {
        append(' ')
      }
    }
    // trailing semicolon before } is optional
    else if (ch === ';') {
      let j = i + 1
      while (j < len && isCSSWhitespace(code[j]))
        j++
      if (code[j] === '}') {
        i++ // skip the semicolon
      }
      else {
        append(ch)
        i++
      }
    }
    // leading zero: 0.x → .x
    else if (ch === '0' && code[i + 1] === '.' && code[i + 2] >= '0' && code[i + 2] <= '9') {
      // Only rewrite a number at a value boundary, never an identifier.
      if (last && last !== ':' && last !== '(' && last !== ',' && !isCSSWhitespace(last)) {
        append(ch)
        i++
      }
      else {
        i++ // skip the 0, the . will be picked up next iteration
      }
    }
    else {
      append(ch!)
      i++
    }
  }

  // Only collapsed spaces before trailing comments can remain.
  if (last === ' ') {
    let end = result.length - 1
    while (result[end - 1] === ' ')
      end--
    return result.slice(0, end)
  }
  // Copy the output so quoted slices cannot retain the entire source.
  return `${result} `.slice(0, -1)
}

function isCSSWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\f' || ch === '\r'
}

function isCSSPunctuation(ch: string): boolean {
  return ch === '{' || ch === '}' || ch === ';' || ch === ',' || ch === '>' || ch === '~' || ch === '+'
}
