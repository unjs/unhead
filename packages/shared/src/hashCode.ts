import {HeadTag} from "@unhead/schema";

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
  // if we have a unique key then we don't need to generate a hash
  if (tag.key || tag._d) {
    return hashCode(`${tag.tag}:${tag.key || tag._d}`)
  }
  return hashCode(`${tag.tag}:${tag.innerText || tag.innerHTML || ''}:${Object.entries(tag.props).map(([key, value]) => `${key}:${String(value)}`).join(',')}`)
}

export function computeHashes(hashes: string[]) {
  // figure out a unique hash for all hashes
  let hash = 0
  for (const h of hashes) {
    hash = Math.imul(hash ^ h.charCodeAt(0), 9 ** 9)
  }
  return String(((hash ^ hash >>> 9) + 0x10000))
}
