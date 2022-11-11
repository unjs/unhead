import { HasElementTags } from 'zhead'
import { defineHeadPlugin, getActiveHead } from '..'
import { IsBrowser } from '../env'

export const ProvideTagHashPlugin = () => {
  return defineHeadPlugin({
    hooks: {
      'tag:normalise': (ctx) => {
        const { tag, entry } = ctx
        // only valid tags
        if (!HasElementTags.includes(tag.tag))
          return
        // when we are SSR rendering tags which are server only and have a dedupe key, we need to provide a hash
        // client side should not be here if the entry is server mode (entry should be ignored)
        // if a user provides a key we will also add the hash as a way to ensure hydration works, good for
        // when SSR / CSR does not match
        const isBrowser = IsBrowser || getActiveHead()?.resolvedOptions?.document
        if (!isBrowser && entry._m === 'server' && tag.key)
          tag.props['data-h-key'] = tag._d
      },
    },
  })
}
