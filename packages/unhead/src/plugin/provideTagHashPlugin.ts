import { defineHeadPlugin, hashCode, hashTag } from '@unhead/shared'
import { getActiveHead } from '..'

export const ProvideTagHashPlugin = () => {
  return defineHeadPlugin({
    hooks: {
      'tag:normalise': (ctx) => {
        const { tag, resolvedOptions } = ctx

        if (resolvedOptions.experimentalHashHydration === true) {
          // always generate a hash
          tag._h = hashTag(tag)
        }

        // only tags which can't dedupe themselves, ssr only
        if (![
          'link',
          'style',
          'script',
          'noscript',
        ].includes(tag.tag) || !tag.key || getActiveHead()?.resolvedOptions?.document)
          return

        // when we are SSR rendering tags which are server only and have a dedupe key, we need to provide a hash
        // client side should not be here if the entry is server mode (entry should be ignored)
        // if a user provides a key we will also add the hash as a way to ensure hydration works, good for
        // when SSR / CSR does not match
        tag._h = hashCode(tag.key)
        tag.props[`data-h-${tag._h}`] = ''
      },
    },
  })
}
