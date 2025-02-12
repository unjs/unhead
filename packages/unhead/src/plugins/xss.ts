import { defineHeadPlugin } from '../utils'

export const XSSPlugin = defineHeadPlugin({
  key: 'xss',
  hooks: {
    'tags:afterResolve': (ctx) => {
      for (const tag of ctx.tags) {
        if (typeof tag.innerHTML === 'string') {
          if (tag.innerHTML && (tag.props.type === 'application/ld+json' || tag.props.type === 'application/json')) {
          // ensure </script> tags get encoded, this is only for JSON, it will break HTML if used
            tag.innerHTML = tag.innerHTML.replace(/</g, '\\u003C')
          }
          else {
          // make sure the tag isn't being ended
            tag.innerHTML = tag.innerHTML
              .replace(new RegExp(`</${tag.tag}`, 'g'), `<\\/${tag.tag}`)
          }
        }
        // TODO delete innerHTML otherwise
      }
    },
  },
})
