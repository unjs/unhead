import type { ReactNode } from 'react'
import type { CreateClientHeadOptions, Unhead } from 'unhead/types'
import { createElement } from 'react'
import { createHead as _createHead, createDebouncedFn, createDomRenderer } from 'unhead/client'
import { UnheadContext } from './context'

export { renderDOMHead } from 'unhead/client'

export function createHead(options: CreateClientHeadOptions = {}): Unhead {
  const domRenderer = createDomRenderer()
  let head: Unhead
  const debouncedRenderer = createDebouncedFn(() => domRenderer(head), fn => setTimeout(fn, 0))
  head = _createHead({ render: debouncedRenderer, ...options })
  return head
}

export function UnheadProvider({ children, head }: { children: ReactNode, head?: ReturnType<typeof createHead> }) {
  return createElement(UnheadContext.Provider, { value: head || createHead() }, children)
}

export type {
  CreateClientHeadOptions,
  Unhead,
}
