import type { NestedHooks } from 'hookable'
import type { HeadEntryHooks } from './types'

export const sanitiseInputPlugin: NestedHooks<HeadEntryHooks> = {
  'tag:resolved': function ({ tag }) {
    for (const p in tag.props) {
      const value = tag.props[p]
      const key = sanitiseAttrName(p)
      delete tag.props[p]
      if (!p.startsWith('on') && p !== 'innerHTML') {
        if (p === 'href' || p === 'src')
          tag.props[key] = encodeURI(value)
        tag.props[key] = sanitiseAttrValue(value)
      }
    }
    if (tag.children) {
      if (tag.tag === 'script')
        delete tag.children
      else
        tag.children = escapeJS(escapeHtml(tag.children))
    }
  },
}
