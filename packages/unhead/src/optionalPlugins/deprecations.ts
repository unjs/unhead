import { defineHeadPlugin } from '@unhead/shared'

export const DeprecationsPlugin = defineHeadPlugin({
  hooks: {
    'tag:normalise': ({ tag }) => {
      if (tag.props.children) {
        tag.innerHTML = tag.props.children
        delete tag.props.children
      }
      if (tag.props.body) {
        tag.tagPosition = 'bodyClose'
        delete tag.props.body
      }
      if (tag.props.hid) {
        tag.key = tag.props.hid
        delete tag.props.hid
      }
      if (tag.props.vmid) {
        tag.key = tag.props.vmid
        delete tag.props.vmid
      }
      if (tag.props.body) {
        tag.tagPosition = 'bodyClose'
        delete tag.props.body
      }
    },
  },
})
