import type { CreateClientHeadOptions, Head } from '../types'
import { IsBrowser } from '../utils'
import { createHeadCore } from '../createHead'
import { DomPlugin } from './plugins/domPlugin'
import { ClientEventHandlerPlugin } from './plugins/eventHandlers'
import { renderDOMHead } from './renderDOMHead'

export function createHead<T extends Record<string, any> = Head>(options: CreateClientHeadOptions = {}) {
  return createHeadCore<T>({
    document: (IsBrowser ? document : undefined),
    ...options,
    plugins: [
      ...(options.plugins || []),
      DomPlugin({
        render: renderDOMHead,
        ...options.domOptions,
      }),
      ClientEventHandlerPlugin,
    ],
  })
}
