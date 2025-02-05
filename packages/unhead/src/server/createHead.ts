import type { CreateServerHeadOptions, Head } from '@unhead/schema'
import { createHeadCore } from '../createHead'
import { ServerEventHandlerPlugin } from './plugins/eventHandlers'
import { PayloadPlugin } from './plugins/payload'

export function createHead<T extends Record<string, any> = Head>(options: CreateServerHeadOptions = {}) {
  return createHeadCore<T>({
    ...options,
    // @ts-expect-error untyped
    document: false,
    init: [
      options.disableDefaults
        ? undefined
        : {
            htmlAttrs: {
              lang: 'en',
            },
            meta: [
              {
                charset: 'utf-8',
              },
              {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1',
              },
            ],
          },
      ...(options.init || []),
    ],
    plugins: [
      ...(options.plugins || []),
      PayloadPlugin,
      ServerEventHandlerPlugin,
    ],
  })
}
