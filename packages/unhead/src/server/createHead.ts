import type { CreateServerHeadOptions, ResolvableHead } from '../types'
import { createUnhead } from '../unhead'
import { capoTagWeight } from './sort'

/* @__NO_SIDE_EFFECTS__ */
export function createHead<T = ResolvableHead>(options: CreateServerHeadOptions = {}) {
  const unhead = createUnhead<T>({
    ...options,
    _tagWeight: capoTagWeight,
    // @ts-expect-error untyped
    document: false,
    propResolvers: [
      ...(options.propResolvers || []),
      (k, v) => {
        if (k && k.startsWith('on') && typeof v === 'function') {
          return `this.dataset.${k}fired = true`
        }
        return v
      },
    ],
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
  })
  unhead._ssrPayload = {}
  unhead.use({
    key: 'server',
    hooks: {
      'tags:resolve': function (ctx) {
        let payload: ResolvableHead = {}
        if (Object.keys(unhead._ssrPayload || {}).length > 0) {
          payload = { ...unhead._ssrPayload }
        }
        // filter non-values
        if (Object.values(payload).some(Boolean)) {
          // add tag for rendering
          ctx.tags.push({
            tag: 'script',
            innerHTML: JSON.stringify(payload),
            props: { id: 'unhead:payload', type: 'application/json' },
          })
        }
      },
    },
  })
  return unhead
}
