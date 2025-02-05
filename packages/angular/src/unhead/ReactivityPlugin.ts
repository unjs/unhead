import { defineHeadPlugin } from '@unhead/shared'
import { resolveSignalHeadInput } from './utils'

export const ReactivityPlugin = defineHeadPlugin({
  hooks: {
    'entries:resolve': (ctx) => {
      for (const entry of ctx.entries)
        entry.input = resolveSignalHeadInput(entry.input)
    },
  },
})
