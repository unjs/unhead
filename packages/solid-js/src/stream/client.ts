import type { CreateStreamableClientHeadOptions, Unhead } from 'unhead/types'
import { createDebouncedFn, renderDOMHead } from 'unhead/client'
import { createStreamableHead as _createStreamableHead } from 'unhead/stream/client'

export { UnheadContext } from '../context'

export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): Unhead {
  const { streamKey, ...rest } = options
  const head = _createStreamableHead({
    ...rest,
    streamKey,
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(fn, 0)),
    },
  })
  return head
}

/**
 * Client-side HeadStream - returns null since head updates are applied via window.__unhead__
 */
export function HeadStream(): null {
  return null
}

export type {
  CreateStreamableClientHeadOptions,
  Unhead,
} from 'unhead/types'
