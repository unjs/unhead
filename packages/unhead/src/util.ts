export type Arrayable<T> = T | Array<T>

export function asArray<T>(value: Arrayable<T>): T[] {
  return Array.isArray(value) ? value : [value]
}

export const HasElementTags = [
  'base',
  'meta',
  'link',
  'style',
  'script',
  'noscript',
]
