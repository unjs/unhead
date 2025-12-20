import type { CreateClientHeadOptions, Unhead } from 'unhead/types'
import { tick } from 'svelte'
import { createHead as _createHead, createDebouncedFn, renderDOMHead } from 'unhead/client'

export { UnheadContextKey } from './context'

export function createHead(options: CreateClientHeadOptions = {}): Unhead {
  const head = _createHead({
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => tick().then(fn)),
    },
    ...options,
  })
  return head
}

export { renderDOMHead } from 'unhead/client'

export type {
  CreateClientHeadOptions,
  Unhead,
}
