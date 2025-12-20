import type { CreateStreamableClientHeadOptions, Unhead } from 'unhead/types'
import { createDebouncedFn, createHead, renderDOMHead } from 'unhead/client'

export { UnheadContext } from '../context'

/**
 * Client-side HeadStreamScript - returns null (script already executed during SSR streaming)
 */
export function HeadStreamScript(): null {
  return null
}

export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): Unhead {
  const { streamKey = '__unhead__', ...rest } = options
  const existing = (window as any)[streamKey]?._head

  // Adopt existing core instance created by virtual module
  if (existing) {
    return existing
  }

  // Fallback: create fresh instance (non-streaming case)
  const head = createHead({
    ...rest,
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(fn, 0)),
    },
  })
  return head
}

export type {
  CreateStreamableClientHeadOptions,
  Unhead,
} from 'unhead/types'
