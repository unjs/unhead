// legacy tag support
import { defineHeadPlugin } from '@unhead/shared'

export function DeprecatedTagAttrPlugin() {
  return defineHeadPlugin({
    hooks: {
      'tag:normalise': function ({ tag }) {
        if (typeof tag.props.body !== 'undefined') {
          tag.tagPosition = 'bodyClose'
          delete tag.props.body
        }
      },
    },
  })
}
