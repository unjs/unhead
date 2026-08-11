/**
 * Lightweight JS minifier in pure JS (no native deps).
 * Strips comments and collapses whitespace while preserving string literals.
 */
export function minifyJS(code: string): string {
  if (!/[\s/]/.test(code))
    return code

  let result = ''
  // Reading the growing result forces V8 to repeatedly flatten its string rope.
  let last = ''
  let i = 0
  const len = code.length
  const append = (value: string) => {
    result += value
    last = value
  }

  while (i < len) {
    const ch = code[i]
    // string literals - preserve as-is
    if (ch === '\'' || ch === '"' || ch === '`') {
      const quote = ch
      append(ch)
      i++
      while (i < len && code[i] !== quote) {
        if (code[i] === '\\' && i + 1 < len) {
          append(code[i++]!)
        }
        append(code[i++]!)
      }
      if (i < len)
        append(code[i++]!) // closing quote
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
      const next = code[i]
      if (hasNewline && last && next && last !== '{' && last !== '}' && last !== ';' && next !== '}' && next !== ';')
        append('\n')
      else if (last && next && isIdentChar(last) && isIdentChar(next))
        append(' ')
      // preserve space between identical + or - to avoid creating ++/-- operators
      else if (last && next && ((last === '+' && next === '+') || (last === '-' && next === '-')))
        append(' ')
    }
    else {
      append(ch!)
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
