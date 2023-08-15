import { defineHeadPlugin } from '@unhead/shared'

export default defineHeadPlugin(head => ({
  mode: 'server',
  hooks: {
    'tags:resolve': function (ctx) {
      const csrPayload: Record<string, any> = {}
      ctx.tags.filter(tag => ['titleTemplate', 'templateParams'].includes(tag.tag) && tag._m === 'server')
        .forEach((tag) => {
          csrPayload[tag.tag] = tag.tag === 'titleTemplate' ? tag.textContent : tag.props
        })
      // add tag for rendering
      Object.keys(csrPayload).length && ctx.tags.push({
        tag: 'script',
        innerHTML: JSON.stringify(csrPayload),
        props: { type: 'text/javascript', id: 'unhead:payload' },
      })
    },
  },
}))
