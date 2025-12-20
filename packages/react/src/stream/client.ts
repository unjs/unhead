import type { ReactNode } from 'react'
import type { CreateStreamableClientHeadOptions, Unhead } from 'unhead/types'
import { createElement } from 'react'
import { createDebouncedFn, createHead, renderDOMHead } from 'unhead/client'

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

/**
 * Client-side HeadStream - renders empty script with suppressHydrationWarning
 */
export function HeadStream(): ReactNode {
  return createElement('script', {
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: '' },
  })
}

export * from '../client'

export type {
  CreateStreamableClientHeadOptions,
  Unhead,
} from 'unhead/types'
