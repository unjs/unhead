function isJsonWhitespace(char: string): boolean {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t'
}

/**
 * Minify JSON by stripping insignificant whitespace without re-serializing tokens.
 * Returns compact or invalid JSON unchanged.
 */
export function minifyJSON(code: string): string {
  let escaped = false
  let inString = false
  let segmentStart = 0
  let chunks: string[] | undefined

  for (let i = 0; i < code.length; i++) {
    const char = code[i]
    if (inString) {
      if (escaped)
        escaped = false
      else if (char === '\\')
        escaped = true
      else if (char === '"')
        inString = false
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (isJsonWhitespace(char)) {
      chunks ||= []
      if (segmentStart < i)
        chunks.push(code.slice(segmentStart, i))
      segmentStart = i + 1
    }
  }

  if (!chunks)
    return code

  try {
    JSON.parse(code)
  }
  catch {
    // Invalid JSON remains byte-for-byte unchanged.
    return code
  }

  if (segmentStart < code.length)
    chunks.push(code.slice(segmentStart))
  return chunks.join('')
}
