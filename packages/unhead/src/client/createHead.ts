import type { CreateHeadOptions, Head } from '@unhead/schema'
import { IsBrowser } from '@unhead/shared'
import { unheadCtx } from '../context'
import { createHeadCore } from '../createHead'
import { DomPlugin } from './domPlugin'

export function createHead<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  const head = createHeadCore<T>({
    document: (IsBrowser ? document : undefined),
    ...options,
  })
  head.use(DomPlugin())
  // should only be one instance client-side
  if (!head.ssr && IsBrowser) {
    unheadCtx.set(head, true)
  }
  return head
}
