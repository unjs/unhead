import type { CreateClientHeadOptions, Unhead } from 'unhead/types'
import { tick } from 'svelte'
import { createHead as _createHead, createDebouncedFn, createDomRenderer } from 'unhead/client'

export { UnheadContextKey } from './context'

export function createHead(options: CreateClientHeadOptions = {}): Unhead {
  const domRenderer = createDomRenderer()
  let head: Unhead
  const debouncedRenderer = createDebouncedFn(() => domRenderer(head), fn => tick().then(fn))
  head = _createHead({ render: debouncedRenderer, ...options })
  return head
}

export { renderDOMHead } from 'unhead/client'

export type {
  CreateClientHeadOptions,
  Unhead,
}
