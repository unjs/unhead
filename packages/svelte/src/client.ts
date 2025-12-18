import type { CreateClientHeadOptions, CreateStreamableClientHeadOptions, Unhead } from 'unhead/types'
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

export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): Unhead {
  const { streamKey, ...rest } = options
  const head = _createHead({
    ...rest,
    experimentalStreamKey: streamKey,
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => tick().then(fn)),
    },
  })
  return head
}

export { renderDOMHead } from 'unhead/client'

/**
 * Client-side HeadStream - returns empty string since head updates are applied via window.__unhead__
 * This exists for hydration compatibility with server-rendered script markers
 */
export function HeadStream(): string {
  return ''
}

export type {
  CreateClientHeadOptions,
  CreateStreamableClientHeadOptions,
  Unhead,
}
