import type { ReactNode } from 'react'
import type { CreateClientHeadOptions, CreateStreamableClientHeadOptions, Unhead } from 'unhead/types'
import { createElement } from 'react'
import { createHead as _createHead, createDebouncedFn, renderDOMHead } from 'unhead/client'
import { UnheadContext } from './context'

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
 * Client-side HeadStream - renders empty script with suppressHydrationWarning
 * Server renders <script>window.__unhead__.push(...)</script> but on client
 * these scripts have already executed, so we render empty and suppress warnings
 */
export function HeadStream(): ReactNode {
  return createElement('script', {
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: '' },
  })
}

export function UnheadProvider({ children, head }: { children: ReactNode, head?: ReturnType<typeof createHead> }) {
  return createElement(UnheadContext.Provider, { value: head || createHead() }, children)
}

export type {
  CreateClientHeadOptions,
  CreateStreamableClientHeadOptions,
  Unhead,
}
