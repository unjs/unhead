import type { CreateClientHeadOptions, ResolvableHead } from '../types'
import { createUnhead } from '../unhead'
import { renderDOMHead } from './renderDOMHead'

export function createHead<T = ResolvableHead>(options: CreateClientHeadOptions = {}) {
  const render = options.domOptions?.render || renderDOMHead
  options.document = options.document || (typeof window !== 'undefined' ? document : undefined)
  const initialPayload = options.document?.head.querySelector('script[id="unhead:payload"]')?.innerHTML || false
  const payload = initialPayload ? JSON.parse(initialPayload) as ResolvableHead & { _safeTitle?: boolean } : undefined
  const safeTitle = payload?._safeTitle === true
  if (payload)
    delete payload._safeTitle
  // restore initial entry from payload (titleTemplate and templateParams)
  const head = createUnhead<T>({
    ...options,
    plugins: [
      ...(options.plugins || []),
      {
        key: 'client',
        hooks: {
          'entries:normalize': ({ entry, tags }) => {
            if (safeTitle && entry.input === payload) {
              for (const tag of tags) {
                if (tag.tag === 'title')
                  tag._safe = true
              }
            }
          },
          'entries:updated': render,
        },
      },
    ],
    init: [
      payload,
      ...(options.init || []),
    ],
  })
  head.ssr = false
  return head
}
