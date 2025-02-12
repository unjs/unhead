import { defineHeadPlugin } from 'unhead/utils'
import { resolveSignalHeadInput } from './utils'

export const ReactivityPlugin = defineHeadPlugin({
  hooks: {
    'entries:resolve': (ctx) => {
      for (const entry of ctx.entries)
        entry.resolvedInput = resolveSignalHeadInput(entry.input)
    },
  },
})
