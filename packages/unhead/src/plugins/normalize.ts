import { defineHeadPlugin, normaliseEntryTags } from '../utils'

export const NormalizePlugin = defineHeadPlugin(head => ({
  hooks: {
    'entries:resolve': async (ctx) => {
      for (const entry of ctx.entries) {
        // apply any custom transformers applied to the entry
        const resolved = entry.resolvedInput || entry.input
        entry.resolvedInput = (entry.transform ? entry.transform(resolved) : resolved)
        if (entry.resolvedInput) {
          for (const tag of normaliseEntryTags(entry)) {
            const tagCtx = { tag, entry, resolvedOptions: head.resolvedOptions }
            ctx.tags.push(tagCtx.tag)
          }
        }
      }
    },
  },
}))
