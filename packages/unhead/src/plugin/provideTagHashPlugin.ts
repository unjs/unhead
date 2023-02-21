import { HasElementTags, defineHeadPlugin, hashTag } from '@unhead/shared'
import { getActiveHead } from '..'
import { IsBrowser } from '../env'

export const ProvideTagHashPlugin = () => {
  return defineHeadPlugin({
    hooks: {
      'tag:normalise': (ctx) => {
        const { tag, entry, resolvedOptions } = ctx

        if (resolvedOptions.experimentalHashHydration === true) {
          // always generate a hash
          tag._h = hashTag(tag)
        }

        const isDynamic = typeof tag.props._dynamic !== 'undefined'
        // only valid tags with a key
        if (!HasElementTags.includes(tag.tag) || !tag.key)
          return

        // ssr only from here
        if (IsBrowser || getActiveHead()?.resolvedOptions?.document)
          return

        // when we are SSR rendering tags which are server only and have a dedupe key, we need to provide a hash
        // client side should not be here if the entry is server mode (entry should be ignored)
        // if a user provides a key we will also add the hash as a way to ensure hydration works, good for
        // when SSR / CSR does not match
        if (entry._m === 'server' || isDynamic) {
          tag._h = tag._h || hashTag(tag)
          tag.props[`data-h-${tag._h}`] = ''
        }
      },
      'tags:resolve': (ctx) => {
        // remove dynamic prop
        ctx.tags = ctx.tags.map((t) => {
          delete t.props._dynamic
          return t
        })
      },
    },
  })
}
