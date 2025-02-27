import type { CreateClientHeadOptions, ResolvableHead } from '../types'
import { createUnhead } from '../unhead'
import { renderDOMHead } from './renderDOMHead'

export function createHead<T = ResolvableHead>(options: CreateClientHeadOptions = {}) {
  // restore initial entry from payload (titleTemplate and templateParams)
  const head = createUnhead<T>({
    document: (typeof window !== 'undefined' ? document : undefined),
    ...options,
  })
  // restore initial entry from payload (titleTemplate and templateParams)
  const initialPayload = head.resolvedOptions.document?.head.querySelector('script[id="unhead:payload"]')?.innerHTML || false
  if (initialPayload) {
    head.push(JSON.parse(initialPayload))
  }
  const render = options.domOptions?.render || renderDOMHead
  head.use({
    key: 'client',
    hooks: {
      'entries:updated': render,
    },
  })
  return head
}
