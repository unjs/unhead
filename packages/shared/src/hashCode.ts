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
  if (tag._h) {
    return tag._h
  }

  if (tag._d) {
    return hashCode(tag._d)
  }

  let content = `${tag.tag}:${tag.textContent || tag.innerHTML || ''}:`

  for (const key in tag.props) {
    content += `${key}:${String(tag.props[key])},`
  }

  return hashCode(content)
}
