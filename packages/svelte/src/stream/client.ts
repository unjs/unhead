import type { CreateStreamableClientHeadOptions, Unhead } from 'unhead/types'
import { tick } from 'svelte'
import { createDebouncedFn, renderDOMHead } from 'unhead/client'
import { createStreamableHead as _createStreamableHead } from 'unhead/stream/client'

export { UnheadContextKey } from '../context'

export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): Unhead {
  const { streamKey, ...rest } = options
  const head = _createStreamableHead({
    ...rest,
    streamKey,
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => tick().then(fn)),
    },
  })
  return head
}

/**
 * Client-side HeadStream - returns empty string since head updates are applied via window.__unhead__
 */
export function HeadStream(): string {
  return ''
}

export type {
  CreateStreamableClientHeadOptions,
  Unhead,
} from 'unhead/types'
