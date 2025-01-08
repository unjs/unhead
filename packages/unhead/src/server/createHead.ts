import type { CreateHeadOptions, Head } from '@unhead/schema'
import { createHeadCore } from '../createHead'
import { ServerEventHandlerPlugin } from './plugins/eventHandlers'
import { PayloadPlugin } from './plugins/payload'

export function createHead<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  return createHeadCore<T>({
    ...options,
    // @ts-expect-error untyped
    document: false,
    plugins: [
      ...(options.plugins || []),
      PayloadPlugin,
      ServerEventHandlerPlugin,
    ],
  })
}
