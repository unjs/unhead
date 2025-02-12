import { defineHeadPlugin } from 'unhead/utils'
import { resolveUnrefHeadInput } from './utils'

export const ReactReactivityPlugin = defineHeadPlugin({
  hooks: {
    'entries:resolve': (ctx) => {
      for (const entry of ctx.entries)
        entry.resolvedInput = resolveUnrefHeadInput(entry.input)
    },
  },
})
