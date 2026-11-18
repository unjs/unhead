import type { HeadTag } from '../types'
import { TagPriorityAliases } from '../utils/const'

export const tagWeight = (tag: HeadTag) => typeof tag.tagPriority === 'number' ? tag.tagPriority : 100 + ((TagPriorityAliases as Record<string, number>)[tag.tagPriority as string] || 0)

export function createDebouncedFn(callee: () => void, delayer: (fn: () => void) => void) {
  let ctxId = 0

  return () => {
    const delayFnCtxId = ++ctxId

    delayer(() => {
      if (ctxId === delayFnCtxId) {
        callee()
      }
    })
  }
}
