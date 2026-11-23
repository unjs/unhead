import type { HeadTag } from '../types'
import { TagPriorityAliases } from '../utils/const'

// The weight of a tag in v3 `createHead` from `unhead/client`
export const tagWeight = (tag: HeadTag) => typeof tag.tagPriority === 'number' ? tag.tagPriority : 100 + ((TagPriorityAliases as Record<string, number>)[tag.tagPriority as string] || 0)
