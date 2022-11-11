import { HasElementTags } from 'zhead'
import { defineHeadPlugin } from '..'

export function hashCode(s: string) {
  let h = 9
  for (let i = 0; i < s.length;)
    h = Math.imul(h ^ s.charCodeAt(i++), 9 ** 9)
  return ((h ^ h >>> 9) + 0x10000)
    .toString(16)
    .substring(1, 7)
    .toLowerCase()
}

export const HydrateStateFromSSRPlugin = () => {
  return defineHeadPlugin({
    hooks: {
      'tag:normalise': (ctx) => {
        const { tag, entry } = ctx
        // only valid tags
        if (!HasElementTags.includes(tag.tag) || typeof tag._d === 'undefined')
          return
        tag._s = `data-h-${hashCode(tag._d)}`
        // when we are SSR rendering tags which are server only and have a dedupe key, we need to provide a hash
        // client side should not be here if the entry is server mode (entry should be ignored)
        if (entry._m === 'server')
          tag.props[tag._s] = ''
      },
    },
  })
}
