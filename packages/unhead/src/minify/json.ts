function isJsonWhitespace(c: number): boolean {
  return c === 32 || c === 10 || c === 13 || c === 9
}

/**
 * Minify JSON by stripping insignificant whitespace without re-serializing tokens.
 * Returns compact or invalid JSON unchanged.
 */
export function minifyJSON(code: string): string {
  const len = code.length
  let segmentStart = 0
  let chunks: string[] | undefined
  let i = 0

  while (i < len) {
    const c = code.charCodeAt(i)
    if (c === 34) { // '"'
      let pos = i + 1
      while (true) {
        const end = code.indexOf('"', pos)
        if (end === -1) {
          i = len
          break
        }
        if (code.charCodeAt(end - 1) !== 92) {
          i = end + 1
          break
        }
        let bs = end - 2
        while (bs >= pos && code.charCodeAt(bs) === 92)
          bs--
        if (((end - 1 - bs) & 1) === 0) {
          i = end + 1
          break
        }
        pos = end + 1
      }
      continue
    }

    if (isJsonWhitespace(c)) {
      chunks ||= []
      if (segmentStart < i)
        chunks.push(code.slice(segmentStart, i))
      i++
      while (i < len && isJsonWhitespace(code.charCodeAt(i)))
        i++
      segmentStart = i
      continue
    }
    i++
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

  if (segmentStart < len)
    chunks.push(code.slice(segmentStart))
  return chunks.join('')
}
