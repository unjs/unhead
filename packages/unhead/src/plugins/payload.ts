import { defineHeadPlugin } from '@unhead/shared'

export default defineHeadPlugin({
  mode: 'server',
  hooks: {
    'tags:beforeResolve': (ctx) => {
      const payload: { titleTemplate?: string | ((s: string) => string), templateParams?: Record<string, string>, title?: string } = {}

      let hasPayload = false

      for (const tag of ctx.tags) {
        if (tag._m !== 'server' || (tag.tag !== 'titleTemplate' && tag.tag !== 'templateParams' && tag.tag !== 'title')) {
          continue
        }

        // @ts-expect-error untyped
        payload[tag.tag] = tag.tag === 'title' || tag.tag === 'titleTemplate'
          ? tag.textContent
          : tag.props
        hasPayload = true
      }

      if (hasPayload) {
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
