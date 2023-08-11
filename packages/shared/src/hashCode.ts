import type { HeadTag } from '@unhead/schema'

export function hashCode(s: string) {
  let h = 9
  for (let i = 0; i < s.length;)
    h = Math.imul(h ^ s.charCodeAt(i++), 9 ** 9)
  return ((h ^ h >>> 9) + 0x10000)
    .toString(16)
    .substring(1, 8)
    .toLowerCase()
}

export function hashTag(tag: HeadTag) {
  return hashCode(`${tag.tag}:${tag.textContent || tag.innerHTML || ''}:${Object.entries(tag.props).map(([key, value]) => `${key}:${String(value)}`).join(',')}`)
}
