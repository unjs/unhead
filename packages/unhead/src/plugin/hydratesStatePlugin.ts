import { HasElementTags } from 'zhead'
import { hashCode } from '../util'
import { defineHeadPlugin } from './defineHeadPlugin'

export const hydratesStatePlugin = defineHeadPlugin({
  hooks: {
    'tag:normalise': (ctx) => {
      const { tag, entry } = ctx
      // only valid tags
      if (!HasElementTags.includes(tag.tag))
        return
      // if we're rendering server side, root meta which will not be removed (only updated) and the meta
      // does not generate dupes (i.e is not a meta tag) then we can skip hydration
      if (typeof tag._d === 'undefined' && entry.mode === 'server')
        return

      // need to get a hashed string version of _d
      // do a simple md5 of the _s
      tag._s = `data-h-${hashCode(tag._d || (tag.tag + JSON.stringify(tag.props)))}`
      tag.props[tag._s] = ''
    },
  },
})
