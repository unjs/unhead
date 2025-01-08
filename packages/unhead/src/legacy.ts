import type { CreateHeadOptions, Head } from '@unhead/schema'
import { IsBrowser } from '@unhead/shared'
import { DomPlugin } from './client/domPlugin'
import { unheadCtx } from './context'
import { createHeadCore } from './createHead'
import { DeprecationsPlugin } from './optionalPlugins/deprecations'
import { PromisesPlugin } from './optionalPlugins/promises'

export function createServerHead<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  // @ts-expect-error untyped
  const head = createHeadCore<T>({ disableCapoSorting: true, ...options, document: false })
  head.use(DeprecationsPlugin)
  head.use(PromisesPlugin)
  return head
}

export function createHead<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  const head = createHeadCore<T>({ disableCapoSorting: true, ...options })
  head.use(DomPlugin())
  head.use(DeprecationsPlugin)
  head.use(PromisesPlugin)
  // should only be one instance client-side
  if (!head.ssr && IsBrowser) {
    unheadCtx.set(head, true)
  }
  return head
}

export { createHeadCore }
