/**
 * Minify JSON by re-serializing (strips whitespace).
 * Returns the original string unchanged if parsing fails.
 */
export function minifyJSON(code: string): string {
  try {
    return JSON.stringify(JSON.parse(code))
  }
  catch {
    return code
  }
}
