import type { HeadPluginInput } from 'unhead/types'

/**
 * Unhead plugin that propagates source location metadata from entry options to tags.
 *
 * On the server, it also serializes the full devtools state into a
 * `<script id="unhead:devtools">` payload so the client bridge can display
 * server-only entries.
 */
export function devtoolsPlugin(): HeadPluginInput {
  return (head: any) => {
    return {
      key: 'devtools',
      hooks: {
        'entries:normalize': function ({ tags, entry }: { tags: any[], entry: any }) {
          const source = entry.options?._source
          if (!source)
            return
          for (const tag of tags) {
            if (!tag._source)
              tag._source = source
          }
        },
        'tags:resolve': function (ctx: any) {
          if (!head.ssr)
            return
          // Serialize SSR entries into a payload for the client bridge
          const entries: any[] = []
          for (const [id, entry] of head.entries) {
            let input: Record<string, any> = {}
            try {
              input = JSON.parse(JSON.stringify(entry.input || {}, (_k, v) => {
                if (typeof v === 'function')
                  return `ƒ ${v.name || 'anonymous'}()`
                if (typeof v === 'undefined')
                  return '⊘ undefined'
                return v
              }))
            }
            catch {}
            entries.push({
              id,
              source: entry.options?._source,
              input,
              tagCount: (entry._tags || []).length,
              mode: 'server',
            })
          }
          // Serialize resolved tags (exclude the devtools payload script itself)
          const tags: any[] = []
          for (const tag of ctx.tags) {
            if (tag.props?.id === 'unhead:devtools' || tag.props?.id === 'unhead:payload')
              continue
            tags.push({
              tag: tag.tag,
              props: { ...tag.props },
              innerHTML: tag.innerHTML,
              textContent: tag.textContent,
              position: tag.tagPosition,
              priority: tag._w,
              dedupeKey: tag._d,
              source: tag._source,
              mode: 'server',
            })
          }
          ctx.tags.push({
            tag: 'script',
            // Escape `<` so a serialized `</script>` cannot close the inline JSON block early
            innerHTML: JSON.stringify({ entries, tags }).replace(/</g, '\\u003C'),
            props: { id: 'unhead:devtools', type: 'application/json' },
          })
        },
      },
    }
  }
}
