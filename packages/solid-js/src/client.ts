import type { CreateClientHeadOptions, CreateStreamableClientHeadOptions, Unhead } from 'unhead/types'
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

export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): Unhead {
  const { streamKey = '__unhead__', ...rest } = options
  const existing = (window as any)[streamKey]?._head

  // Adopt existing core instance created by virtual module
  if (existing) {
    return existing
  }

  // Fallback: create fresh instance (non-streaming case)
  const head = _createHead({
    ...rest,
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(fn, 0)),
    },
  })
  return head
}

/**
 * Client-side HeadStreamScript - returns null (script already executed during SSR streaming)
 * Must match server's HeadStreamScript for hydration
 */
export function HeadStreamScript(): null {
  return null
}

export type {
  CreateClientHeadOptions,
  CreateStreamableClientHeadOptions,
  Unhead,
}
