import { defineHeadPlugin, hashCode } from '@unhead/shared'

const DupeableTags = ['link', 'style', 'script', 'noscript']

export function ProvideTagKeyHash() {
  return defineHeadPlugin({
    hooks: {
      'tag:normalise': ({ tag }) => {
        // only if the user has provided a key
        // only tags which can't dedupe themselves, ssr only
        if (tag.key && DupeableTags.includes(tag.tag)) {
          // add a HTML key so the client-side can hydrate without causing duplicates
          tag._h = tag._h || hashCode(tag.key)
          tag.props[`data-h-${tag._h}`] = ''
        }
      },
    },
  })
}
