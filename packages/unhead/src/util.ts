export type Arrayable<T> = T | Array<T>

export function asArray<T>(value: Arrayable<T>): T[] {
  return Array.isArray(value) ? value : [value]
}

export function hashCode(s: string) {
  let h = 9
  for (let i = 0; i < s.length;)
    h = Math.imul(h ^ s.charCodeAt(i++), 9 ** 9)
  return ((h ^ h >>> 9) + 0x10000)
    .toString(16)
    .substring(1, 7)
    .toLowerCase()
}
