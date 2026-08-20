/**
 * Lightweight CSS minifier in pure JS (no native deps).
 * Strips comments and collapses whitespace while preserving string literals.
 */
export function minifyCSS(code: string): string {
  if (!/[\s/]|;\}|0\.\d/.test(code))
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
      const quote = ch
      append(ch)
      i++
      while (i < len && code[i] !== quote) {
        if (code[i] === '\\' && i + 1 < len)
          append(code[i++]!)
        append(code[i++]!)
      }
      if (i < len)
        append(code[i++]!)
    }
    // comments
    else if (ch === '/' && code[i + 1] === '*') {
      i += 2
      while (i < len && !(code[i] === '*' && code[i + 1] === '/'))
        i++
      i += 2
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
    else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      while (i < len && (code[i] === ' ' || code[i] === '\t' || code[i] === '\n' || code[i] === '\r'))
        i++
      const next = code[i]
      // strip space before ! for !important
      if (next === '!')
        continue
      if (parenDepth > 0) {
        // inside parens (calc/min/max/clamp/var): strip around * and / (safe per spec),
        // preserve around + and - (required by spec), strip around base punctuation
        if (last && next && !isCSSCalcPunctuation(last) && !isCSSCalcPunctuation(next))
          append(' ')
      }
      else if (last && next && !isCSSPunctuation(last) && !isCSSPunctuation(next)) {
        append(' ')
      }
    }
    // trailing semicolon before } is optional
    else if (ch === ';') {
      let j = i + 1
      while (j < len && (code[j] === ' ' || code[j] === '\t' || code[j] === '\n' || code[j] === '\r'))
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
      // only strip if prev is not a digit (avoid turning 10.5 into 1.5)
      if (last && last >= '0' && last <= '9') {
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

  return result.trim()
}

function isCSSPunctuation(ch: string): boolean {
  return ch === '{' || ch === '}' || ch === ';' || ch === ':' || ch === ',' || ch === '>' || ch === '~' || ch === '+' || ch === '(' || ch === ')'
}

function isCSSCalcPunctuation(ch: string): boolean {
  return ch === '*' || ch === '/' || ch === '(' || ch === ')' || ch === ','
}
