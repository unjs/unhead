import type { ClientUnhead } from 'unhead/client'
import type { CreateClientHeadOptions, Unhead } from 'unhead/types'
import { tick } from 'svelte'
import { createHead as _createHead, createDebouncedFn, createDomRenderer } from 'unhead/client'

export { UnheadContextKey } from './context'

export function createHead(options: CreateClientHeadOptions = {}): ClientUnhead {
  const domRenderer = createDomRenderer()
  let head: ClientUnhead
  const debouncedRenderer = createDebouncedFn(() => domRenderer(head), fn => tick().then(fn))
  head = _createHead({ render: debouncedRenderer, ...options })
  return head
}

export { renderDOMHead } from 'unhead/client'

export type {
  CreateClientHeadOptions,
  Unhead,
}
