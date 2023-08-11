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
        prevHash = head.resolvedOptions.document?.head.querySelector('meta[name="unhead:ssr"]')?.getAttribute('content') || false
      },
      'tags:resolve': function ({ tags }) {
        // always generate a hash
        const hash = hashCode(
          tags
            // tag must not be server only
            .filter((tag) => {
              const entry = head.headEntries().find(e => e._i === tag._e)
              return entry && entry.mode !== 'server'
            })
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
        tags.push({ tag: 'meta', props: { name: 'unhead:ssr', content: String(prevHash) } })
      },
    },
  })
}
