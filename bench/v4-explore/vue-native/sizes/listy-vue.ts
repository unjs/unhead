// candidate 1 micro-measure: the same contract built on @vue/shared
// (normalizeClass/normalizeStyle/parseStringStyle are externals: free in a
// vue app). The wrapper is the residual cost because v4 renderers consume
// Set/Map shapes, not vue's string/object shapes.
import { isString, normalizeClass, normalizeStyle, parseStringStyle } from '@vue/shared'

export function normListy(value: any, isStyle: boolean): any {
  if (!isStyle) {
    const store = new Set<string>()
    for (const c of normalizeClass(value).split(' ')) c && store.add(c)
    return store
  }
  const n = normalizeStyle(value)
  const obj = isString(n) ? parseStringStyle(n) : n || {}
  return new Map(Object.entries(obj).map(([k, v]) => [k.trim(), String(v)]))
}
