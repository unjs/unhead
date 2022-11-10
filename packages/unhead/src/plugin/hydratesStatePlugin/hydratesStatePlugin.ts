import { HasElementTags } from 'zhead'
import { defineHeadPlugin } from '../..'
import { hashCode } from './hashCode'

export const HydratesStatePlugin = () => {
  return defineHeadPlugin({
    hooks: {
      'tag:normalise': (ctx) => {
        const { tag, entry } = ctx
        // only valid tags
        if (!HasElementTags.includes(tag.tag))
          return
        // if we're rendering server side, root meta which will not be removed (only updated) and the meta
        // does not generate dupes (i.e is not a meta tag) then we can skip hydration
        if (typeof tag._d === 'undefined' && entry._m === 'server')
          return

        // _s is the hydrate state key, it's a light-weight hash which may have conflicts
        tag._s = `data-h-${hashCode(tag._d || (JSON.stringify({ tag: tag.tag, props: tag.props, children: tag.children })))}`
        tag.props[tag._s] = ''
      },
    },
  })
}
