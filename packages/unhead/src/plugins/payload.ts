import { defineHeadPlugin } from '@unhead/shared'

export default defineHeadPlugin({
  mode: 'server',
  hooks: {
    'tags:resolve': function (ctx) {
      const csrPayload: Record<string, any> = {}
      ctx.tags.filter(tag => ['titleTemplate', 'templateParams', 'title'].includes(tag.tag) && tag._m === 'server')
        .forEach((tag) => {
          csrPayload[tag.tag] = tag.tag.startsWith('title') ? tag.textContent : tag.props
        })
      // add tag for rendering
      Object.keys(csrPayload).length && ctx.tags.push({
        tag: 'script',
        innerHTML: JSON.stringify(csrPayload),
        props: { id: 'unhead:payload', type: 'application/json' },
      })
    },
  },
})
