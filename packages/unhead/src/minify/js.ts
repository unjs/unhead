/**
 * Lightweight JS minifier in pure JS (no native deps).
 * Strips comments and collapses whitespace while preserving string literals.
 */
export function minifyJS(code: string): string {
  let result = ''
  let i = 0
  const len = code.length

  while (i < len) {
    const ch = code[i]
    // string literals - preserve as-is
    if (ch === '\'' || ch === '"' || ch === '`') {
      const quote = ch
      result += ch
      i++
      while (i < len && code[i] !== quote) {
        if (code[i] === '\\') {
          result += code[i++]
        }
        result += code[i++]
      }
      if (i < len)
        result += code[i++] // closing quote
    }
    // single-line comment
    else if (ch === '/' && code[i + 1] === '/') {
      i += 2
      while (i < len && code[i] !== '\n')
        i++
    }
    // multi-line comment
    else if (ch === '/' && code[i + 1] === '*') {
      i += 2
      while (i < len && !(code[i] === '*' && code[i + 1] === '/'))
        i++
      i += 2
    }
    // whitespace - collapse, preserving newlines for ASI safety
    else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      let hasNewline = false
      while (i < len && (code[i] === ' ' || code[i] === '\t' || code[i] === '\n' || code[i] === '\r')) {
        if (code[i] === '\n')
          hasNewline = true
        i++
      }
      const prev = result.at(-1)
      const next = code[i]
      if (hasNewline && prev && next && prev !== '{' && prev !== '}' && prev !== ';' && next !== '}' && next !== ';')
        result += '\n'
      else if (prev && next && isIdentChar(prev) && isIdentChar(next))
        result += ' '
      // preserve space between identical + or - to avoid creating ++/-- operators
      else if (prev && next && ((prev === '+' && next === '+') || (prev === '-' && next === '-')))
        result += ' '
    }
    else {
      result += ch
      i++
    }
  }

  return result.trim()
}

function isIdentChar(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z')
    || (ch >= 'A' && ch <= 'Z')
    || (ch >= '0' && ch <= '9')
    || ch === '_'
    || ch === '$'
}
