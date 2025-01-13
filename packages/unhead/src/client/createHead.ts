import type { CreateClientHeadOptions, Head } from '@unhead/schema'
import { IsBrowser } from '@unhead/shared'
import { unheadCtx } from '../context'
import { createHeadCore } from '../createHead'
import { DomPlugin } from './plugins/domPlugin'
import { ClientEventHandlerPlugin } from './plugins/eventHandlers'

export function createHead<T extends Record<string, any> = Head>(options: CreateClientHeadOptions = {}) {
  const head = createHeadCore<T>({
    document: (IsBrowser ? document : undefined),
    ...options,
    plugins: [
      ...(options.plugins || []),
      DomPlugin(options.domOptions),
      ClientEventHandlerPlugin,
    ],
  })
  unheadCtx.set(head, true)
  return head
}
