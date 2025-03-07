import type { CreateClientHeadOptions, ResolvableHead } from '../types'
import { createUnhead } from '../unhead'
import { renderDOMHead } from './renderDOMHead'

export function createHead<T = ResolvableHead>(options: CreateClientHeadOptions = {}) {
  const render = options.domOptions?.render || renderDOMHead
  options.document = options.document || (typeof window !== 'undefined' ? document : undefined)
  const initialPayload = options.document?.head.querySelector('script[id="unhead:payload"]')?.innerHTML || false
  // restore initial entry from payload (titleTemplate and templateParams)
  return createUnhead<T>({
    ...options,
    plugins: [
      ...(options.plugins || []),
      {
        key: 'client',
        hooks: {
          'entries:updated': render,
        },
      },
    ],
    init: [
      JSON.parse(initialPayload || '{}'),
      ...(options.init || []),
    ],
  })
}
