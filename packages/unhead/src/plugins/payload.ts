import { defineHeadPlugin } from '@unhead/shared'

export default defineHeadPlugin({
  mode: 'server',
  hooks: {
    'tags:resolve': function (ctx) {
      const payload: { titleTemplate: string | ((s: string) => string); templateParams: Record<string, string>; title: string } = {}
      ctx.tags.filter(tag => ['titleTemplate', 'templateParams', 'title'].includes(tag.tag) && tag._m === 'server')
        .forEach((tag) => {
          payload[tag.tag] = tag.tag.startsWith('title') ? tag.textContent : tag.props
        })
      // add tag for rendering
      Object.keys(payload).length && ctx.tags.push({
        tag: 'script',
        innerHTML: JSON.stringify(payload),
        props: { id: 'unhead:payload', type: 'application/json' },
      })
    },
  },
})
