import type { ReactNode } from 'react'
import type { CreateClientHeadOptions, MergeHead } from 'unhead/types'
import type { MaybeComputedRef, ReactiveHead, ReactUnhead } from './types'
import { createElement } from 'react'
import { createHead as _createHead, createDebouncedFn, renderDOMHead } from 'unhead/client'
import { UnheadContext } from './context'

export { renderDOMHead } from 'unhead/client'

export function createHead<T extends MergeHead>(options: Omit<CreateClientHeadOptions, 'propResolvers'> = {}): ReactUnhead<T> {
  const head = _createHead<MaybeComputedRef<ReactiveHead<T>>>({
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(fn, 0)),
    },
    ...options,
    propResolvers: [
      (_: string, r: any) => {
        if (typeof r === 'object' && 'current' in r) {
          return r.current
        }
        return r
      },
    ],
  }) as ReactUnhead<T>
  return head
}

export function UnheadProvider({ children, head }: { children: ReactNode, head?: ReturnType<typeof createHead> }) {
  return createElement(UnheadContext.Provider, { value: head || createHead() }, children)
}
