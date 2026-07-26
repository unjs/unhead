import { defineHeadPlugin } from './defineHeadPlugin'

/**
 * Maps unhead v1/v2 tag props (`children`, `hid`, `vmid`, `body`, `renderPriority`) to their
 * v3 equivalents (`innerHTML`, `key`, `tagPosition`, `tagPriority`).
 *
 * Intended as a temporary migration aid. Remove once all call sites use the v3 API.
 *
 * @deprecated Will be removed in v4. Migrate tag props to their v3 equivalents
 * (`innerHTML`, `key`, `tagPosition`, `tagPriority`) directly and drop this plugin.
 */
export const DeprecationsPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'deprecations',
  hooks: {
    'entries:normalize': ({ tags }) => {
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
        if ('body' in tag.props) {
          if (tag.props.body) {
            tag.tagPosition = 'bodyClose'
          }
          delete tag.props.body
        }
        if (tag.props.renderPriority != null) {
          tag.tagPriority = tag.props.renderPriority
          delete tag.props.renderPriority
        }
      }
    },
  },
})
