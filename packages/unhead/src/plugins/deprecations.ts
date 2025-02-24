import { defineHeadPlugin } from './defineHeadPlugin'

export const DeprecationsPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'deprecations',
  hooks: {
    'entries:normalize': ({ tags }) => {
      // copy logic from above hook
      for (const tag of tags) {
        if (tag.props.children) {
          tag.innerHTML = tag.props.children
          delete tag.props.children
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
      }
    },
  },
})
