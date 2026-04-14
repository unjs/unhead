import type { SourceLocation } from './types'

export function createLocationResolver(code: string): (offset: number) => SourceLocation {
  const lineStarts: number[] = [0]
  for (let i = 0; i < code.length; i++) {
    if (code.charCodeAt(i) === 10 /* \n */)
      lineStarts.push(i + 1)
  }

  return function resolve(offset: number): SourceLocation {
    // Binary search for the greatest line start <= offset.
    let lo = 0
    let hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= offset)
        lo = mid
      else
        hi = mid - 1
    }
    return { line: lo + 1, column: offset - lineStarts[lo] }
  }
}
