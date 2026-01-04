import type { CreateClientHeadOptions, HeadTag, ResolvableHead } from '../types'
import { createUnhead } from '../unhead'
import { TagPriorityAliases } from '../utils/const'
import { renderDOMHead } from './renderDOMHead'

function tagWeight(tag: HeadTag) {
  return typeof tag.tagPriority === 'number'
    ? tag.tagPriority
    : 100 + (TagPriorityAliases[tag.tagPriority as keyof typeof TagPriorityAliases] || 0)
}

export function createHead<T = ResolvableHead>(options: CreateClientHeadOptions = {}) {
  const render = options.domOptions?.render || renderDOMHead
  options.document = options.document || (typeof window !== 'undefined' ? document : undefined)
  const initialPayload = options.document?.head.querySelector('script[id="unhead:payload"]')?.innerHTML || false
  // restore initial entry from payload (titleTemplate and templateParams)
  return createUnhead<T>({
    ...options,
    _tagWeight: tagWeight,
    plugins: [
      ...(options.plugins || []),
      {
        key: 'client',
        hooks: {
          'entries:updated': (head) => { render(head) },
        },
      },
    ],
    init: [
      initialPayload ? JSON.parse(initialPayload) : false,
      ...(options.init || []),
    ],
  })
}
