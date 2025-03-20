import type { CreateServerHeadOptions, HeadTag, ResolvableHead } from '../types'
import { createUnhead } from '../unhead'

/* @__NO_SIDE_EFFECTS__ */
export function createHead<T = ResolvableHead>(options: CreateServerHeadOptions = {}) {
  const unhead = createUnhead<T>({
    ...options,
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
        const title = ctx.tagMap.get('title') as HeadTag | undefined
        const titleTemplate = ctx.tagMap.get('titleTemplate') as HeadTag | undefined
        let payload: ResolvableHead = {
          title: title?.mode === 'server' ? unhead._title : undefined,
          titleTemplate: titleTemplate?.mode === 'server' ? unhead._titleTemplate : undefined,
        }
        if (Object.keys(unhead._ssrPayload || {}).length > 0) {
          payload = {
            ...unhead._ssrPayload,
            ...payload,
          }
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
