import type { CreateClientHeadOptions, Unhead } from 'unhead/types'
import { createHead as _createHead, createDebouncedFn, createDomRenderer } from 'unhead/client'

export { UnheadContext } from './context'

export { renderDOMHead } from 'unhead/client'

export function createHead(options: CreateClientHeadOptions = {}): Unhead {
  const domRenderer = createDomRenderer()
  let head: Unhead
  const debouncedRenderer = createDebouncedFn(() => domRenderer(head), fn => setTimeout(fn, 0))
  head = _createHead({ render: debouncedRenderer, ...options })
  return head
}

export type {
  CreateClientHeadOptions,
  Unhead,
}
