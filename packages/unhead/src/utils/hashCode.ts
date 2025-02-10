import type { HeadTag } from '../types'

export function hashCode(s: string) {
  const len = s.length
  let h = 9
  const pow = 387420489 // Pre-computed 9**9

  // Process 4 chars at once when possible
  let i = 0
  for (; i + 3 < len; i += 4) {
    h = Math.imul(h ^ s.charCodeAt(i)
      ^ (s.charCodeAt(i + 1) << 8)
      ^ (s.charCodeAt(i + 2) << 16)
      ^ (s.charCodeAt(i + 3) << 24), pow)
  }

  // Handle remaining chars
  for (; i < len; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), pow)
  }

  return ((h ^ h >>> 9) + 0x10000).toString(16).slice(1, 8)
}

export const hashTag = (tag: HeadTag) => tag._h || tag._d || `${tag.tag}:${tag.textContent || tag.innerHTML || ''}:${Object.entries(tag.props).map(([k, v]) => `${k}:${String(v)}`).join(',')}`
