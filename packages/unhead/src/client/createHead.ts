import type { CreateClientHeadOptions, Head } from '@unhead/schema'
import { IsBrowser } from '@unhead/shared'
import { createHeadCore } from '../createHead'
import { DomPlugin } from './plugins/domPlugin'
import { ClientEventHandlerPlugin } from './plugins/eventHandlers'

export function createHead<T extends Record<string, any> = Head>(options: CreateClientHeadOptions = {}) {
  return createHeadCore<T>({
    document: (IsBrowser ? document : undefined),
    ...options,
    plugins: [
      ...(options.plugins || []),
      DomPlugin(options.domOptions),
      ClientEventHandlerPlugin,
    ],
  })
}
