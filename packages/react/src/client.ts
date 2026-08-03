import type { ReactNode } from 'react'
import type { CreateClientHeadOptions, Unhead } from 'unhead/types'
import { createElement, useRef } from 'react'
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

interface LegacyUnheadProviderProps {
  children: ReactNode
  value?: never
  /**
   * @deprecated Use `value` for a consistent provider API across client and server entries.
   */
  head?: Unhead
}

interface UniversalUnheadProviderProps {
  children: ReactNode
  value: Unhead
  head?: never
}

export type UnheadProviderProps = LegacyUnheadProviderProps | UniversalUnheadProviderProps

export function UnheadProvider({ children, value, head }: UnheadProviderProps) {
  const headRef = useRef<Unhead | null>(null)
  if (value !== undefined && head !== undefined)
    throw new TypeError('UnheadProvider received both value and head props')

  const suppliedHead = value ?? head
  if (suppliedHead === undefined && headRef.current === null)
    headRef.current = createHead()
  return createElement(UnheadContext.Provider, { value: suppliedHead ?? headRef.current }, children)
}

export type {
  CreateClientHeadOptions,
  Unhead,
}
