/**
 * Minify JSON by re-serializing (strips whitespace).
 */
export function minifyJSON(code: string): string {
  return JSON.stringify(JSON.parse(code))
}
