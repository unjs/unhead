import { defineHeadPlugin, hashCode, hashTag } from '@unhead/shared'
import type { Unhead } from '@unhead/schema'

/* @__NO_SIDE_EFFECTS__ */ export function HashHydrationPlugin() {
  let prevHash: string | false = false
  let dirty = false
  let head: Unhead
  return defineHeadPlugin({
    hooks: {
      'init': function (_head) {
        head = _head
        if (!head.ssr)
          prevHash = head.resolvedOptions.document?.head.querySelector('meta[name="unhead:ssr"]')?.getAttribute('content') || false
        if (!prevHash)
          dirty = true
      },
      'tags:resolve': function ({ tags }) {
        const nonServerTags = tags.filter(tag => tag._m !== 'server')

        // always generate a hash
        const hash = !nonServerTags.length
          ? false
          : hashCode(
            nonServerTags
              .map(tag => hashTag(tag))
              .join(''),
          )
        // the SSR hash matches the CSR hash, we can skip the render
        if (prevHash !== hash && prevHash !== false)
          dirty = true
        else
          prevHash = hash
      },
      'dom:beforeRender': function (ctx) {
        ctx.shouldRender = dirty
        dirty = false
      },
      'ssr:render': function ({ tags }) {
        prevHash && tags.push({ tag: 'meta', props: { name: 'unhead:ssr', content: String(prevHash) } })
      },
    },
  })
}
