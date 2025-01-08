import type { CreateHeadOptions, Head } from '@unhead/schema'
import { IsBrowser } from '@unhead/shared'
import { DomPlugin } from './client/plugins/domPlugin'
import { ClientEventHandlerPlugin } from './client/plugins/eventHandlers'
import { unheadCtx } from './context'
import { createHeadCore } from './createHead'
import { DeprecationsPlugin } from './optionalPlugins/deprecations'
import { PromisesPlugin } from './optionalPlugins/promises'
import { ServerEventHandlerPlugin } from './server/plugins/eventHandlers'
import { PayloadPlugin } from './server/plugins/payload'

export function createServerHead<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  return createHeadCore<T>({
    disableCapoSorting: true,
    ...options,
    // @ts-expect-error untyped
    document: false,
    plugins: [
      ...(options.plugins || []),
      DomPlugin(),
      DeprecationsPlugin,
      PromisesPlugin,
      ServerEventHandlerPlugin,
      PayloadPlugin,
    ],
  })
}

export function createHead<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  const head = createHeadCore<T>({ disableCapoSorting: true, ...options, plugins: [
    ...(options.plugins || []),
    DomPlugin(),
    DeprecationsPlugin,
    PromisesPlugin,
    ClientEventHandlerPlugin,
  ] })
  // should only be one instance client-side
  if (!head.ssr && IsBrowser) {
    unheadCtx.set(head, true)
  }
  return head
}

export { createHeadCore }
