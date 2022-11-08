// legacy tag support
import { defineHeadPlugin } from '../defineHeadPlugin'

export const DeprecatedTagAttrPlugin = () => {
  return defineHeadPlugin({
    hooks: {
      'tag:normalise': function ({ tag }) {
        if (tag.props.body) {
          tag.tagPosition = 'bodyClose'
          delete tag.props.body
        }
      },
    },
  })
}
