import type { HeadTag } from '../types'
import { UsesMergeStrategy } from './const'

export function isTagMerge(next: HeadTag, prev: HeadTag): boolean {
  return (next.tagDuplicateStrategy || (UsesMergeStrategy.has(next.tag) || (next.key && next.key === prev.key) ? 'merge' : undefined)) === 'merge'
}

export function mergeTagProps(prev: HeadTag['props'], next: HeadTag['props']): HeadTag['props'] {
  const props = { ...prev }
  for (const p in next) {
    // @ts-expect-error untyped - style is Map, class is Set at runtime
    props[p] = p === 'style'
      ? new Map([...(prev.style || []) as any, ...next[p] as any])
      : p === 'class' ? new Set([...(prev.class || []) as any, ...next[p] as any]) : next[p]
  }
  return props
}
