import type { CreateClientHeadOptions, Head } from '@unhead/schema'
import { IsBrowser } from '@unhead/shared'
import { ClientEventHandlerPlugin, DomPlugin } from '../client'
import { unheadCtx } from '../context'
import { createHeadCore } from '../createHead'
import { WebWorkerResolverPlugin } from './webWorkerResolverPlugin'

export function createHead<T extends Record<string, any> = Head>(options: CreateClientHeadOptions = {}) {
  const head = createHeadCore<T>({
    document: (IsBrowser ? document : undefined),
    ...options,
    plugins: [
      ...(options.plugins || []),
      WebWorkerResolverPlugin,
      DomPlugin(options.domOptions),
      ClientEventHandlerPlugin,
    ],
  })
  unheadCtx.set(head, true)
  return head
}
