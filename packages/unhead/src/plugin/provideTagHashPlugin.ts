import { hashCode } from '@unhead/dom'
import { HasElementTags, defineHeadPlugin, getActiveHead } from '..'
import { IsBrowser } from '../env'

export const ProvideTagHashPlugin = () => {
  return defineHeadPlugin({
    hooks: {
      'tag:normalise': (ctx) => {
        const { tag, entry } = ctx
        const isDynamic = typeof tag.props._dynamic !== 'undefined'
        // only valid tags with a key
        if (!HasElementTags.includes(tag.tag) || !tag.key)
          return
        // @ts-expect-error untyped
        tag._hash = hashCode(JSON.stringify({ tag: tag.tag, key: tag.key }))

        // ssr only from here
        if (IsBrowser || getActiveHead()?.resolvedOptions?.document)
          return

        // when we are SSR rendering tags which are server only and have a dedupe key, we need to provide a hash
        // client side should not be here if the entry is server mode (entry should be ignored)
        // if a user provides a key we will also add the hash as a way to ensure hydration works, good for
        // when SSR / CSR does not match
        if (entry._m === 'server' || isDynamic) {
          // @ts-expect-error untyped
          tag.props[`data-h-${tag._hash}`] = ''
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
