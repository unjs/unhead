import { defineHeadPlugin, hashCode } from '@unhead/shared'

const DupeableTags = new Set(['link', 'style', 'script', 'noscript'])

export default defineHeadPlugin({
  hooks: {
    'tag:normalise': ({ tag }) => {
      // only if the user has provided a key
      // only tags which can't dedupe themselves, ssr only
      if (tag.key && DupeableTags.has(tag.tag)) {
        // add a HTML key so the client-side can hydrate without causing duplicates
        tag.props['data-hid'] = tag._h = hashCode(tag.key!)
      }
    },
  },
})
