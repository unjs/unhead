/**
 * Lightweight JS minifier in pure JS (no native deps).
 * Keeps uncertain syntax unchanged instead of guessing its lexical context.
 */
export function minifyJS(code: string): string {
  if (!/[\s/]/.test(code))
    return code

  // HTML comments have line-sensitive rules outside this scanner's scope.
  if (code.includes('<!--') || code.includes('-->'))
    return code

  let result = ''
  // Never read the growing rope to find its last character.
  let last = ''
  let separator: '' | ' ' | '\n' = ''
  let i = 0
  const len = code.length
  const append = (value: string) => {
    result += value
    last = value[value.length - 1]!
  }

  while (i < len) {
    const ch = code[i]!
    // Comments act as token separators. Block comments can also carry ASI.
    if (/\s/.test(ch) || (ch === '/' && (code[i + 1] === '/' || code[i + 1] === '*'))) {
      let hasNewline = false
      if (ch === '/') {
        const line = code[i + 1] === '/'
        i += 2
        while (i < len) {
          const current = code[i]!
          if (isLineTerminator(current)) {
            hasNewline = true
            if (line)
              break
          }
          if (!line && current === '*' && code[i + 1] === '/')
            break
          i++
        }
        if (!line) {
          if (i >= len)
            return code
          i += 2
        }
      }
      else {
        while (i < len && /\s/.test(code[i]!)) {
          hasNewline ||= isLineTerminator(code[i]!)
          i++
        }
      }
      separator = hasNewline ? '\n' : separator || ' '
      continue
    }

    // A slash needs parser context to distinguish division from a regex.
    // Templates need recursive expression lexing. Escaped identifiers also
    // need token decoding. Leave the entire input intact in these cases.
    if (ch === '/' || ch === '`' || ch === '\\')
      return code

    if (separator && last) {
      if (separator === '\n') {
        append('\n')
      }
      else if ((isIdentChar(last) && isIdentChar(ch))
        || (last >= '0' && last <= '9' && ch === '.')
        || (isOperatorChar(last) && isOperatorChar(ch))) {
        append(' ')
      }
    }
    separator = ''

    if (ch === '\'' || ch === '"') {
      const start = i++
      while (i < len && code[i] !== ch) {
        if (code[i] === '\\')
          i++
        i++
      }
      if (i >= len)
        return code
      append(code.slice(start, ++i))
    }
    else {
      append(ch)
      i++
    }
  }

  return result.trim()
}

function isLineTerminator(ch: string): boolean {
  return ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029'
}

function isIdentChar(ch: string): boolean {
  // Conservatively include every non-ASCII code unit, including surrogates.
  return (ch >= 'a' && ch <= 'z')
    || (ch >= 'A' && ch <= 'Z')
    || (ch >= '0' && ch <= '9')
    || ch === '_'
    || ch === '$'
    || ch.charCodeAt(0) >= 0x80
}

function isOperatorChar(ch: string): boolean {
  return '+-*=!<>?&|^~%.'.includes(ch)
}
