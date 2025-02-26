import type { CreateServerHeadOptions, Head, HeadTag } from '../types'
import { createHeadCore } from '../createHead'

export function createHead<T = Head>(options: CreateServerHeadOptions = {}) {
  const unhead = createHeadCore<T>({
    ...options,
    // @ts-expect-error untyped
    document: false,
    propResolvers: [
      ...(options.propResolvers || []),
      (k, v) => {
        if (k && k.startsWith('on') && typeof v === 'function') {
          return `this.dataset.${k}fired = true`
        }
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
  unhead.use({
    key: 'server',
    hooks: {
      'tags:resolve': function (ctx) {
        const title = ctx.tagMap.get('title') as HeadTag | undefined
        const titleTemplate = ctx.tagMap.get('titleTemplate') as HeadTag | undefined
        const templateParams = ctx.tagMap.get('templateParams') as HeadTag | undefined
        const payload: Head = {
          title: title?.mode === 'server' ? unhead._title : undefined,
          titleTemplate: titleTemplate?.mode === 'server' ? unhead._titleTemplate : undefined,
          templateParams: templateParams?.mode === 'server' ? unhead._templateParams : undefined,
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
