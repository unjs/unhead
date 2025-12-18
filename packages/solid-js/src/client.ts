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
  const { streamKey, ...rest } = options
  const head = _createHead({
    ...rest,
    experimentalStreamKey: streamKey,
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(fn, 0)),
    },
  })
  return head
}

/**
 * Client-side HeadStream - returns null since head updates are applied via window.__unhead__
 * This exists for hydration compatibility with server-rendered HeadStream markers
 */
export function HeadStream(): null {
  return null
}

export type {
  CreateClientHeadOptions,
  CreateStreamableClientHeadOptions,
  Unhead,
}
