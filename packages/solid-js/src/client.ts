import type { CreateClientHeadOptions, Unhead } from 'unhead/types'
import { createHead as _createHead, createDebouncedFn, renderDOMHead } from 'unhead/client'

export { UnheadContext } from './context'

export { renderDOMHead } from 'unhead/client'

export function createHead(options: CreateClientHeadOptions = {}): Unhead {
  const head = _createHead({
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(fn, 0)),
    },
    ...options,
  })
  return head
}

export type {
  CreateClientHeadOptions,
  Unhead,
}
