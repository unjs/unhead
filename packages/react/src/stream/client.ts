import type { ReactNode } from 'react'
import type { CreateStreamableClientHeadOptions, Unhead } from 'unhead/types'
import { createElement } from 'react'
import { createDebouncedFn, renderDOMHead } from 'unhead/client'
import { createStreamableHead as _createStreamableHead } from 'unhead/stream/client'
import { UnheadContext } from '../context'

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
 * Client-side HeadStream - renders empty script with suppressHydrationWarning
 */
export function HeadStream(): ReactNode {
  return createElement('script', {
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: '' },
  })
}

export function UnheadProvider({ children, head }: { children: ReactNode, head?: Unhead }) {
  return createElement(UnheadContext.Provider, { value: head }, children)
}

export type {
  CreateStreamableClientHeadOptions,
  Unhead,
} from 'unhead/types'
