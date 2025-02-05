import { defineHeadPlugin } from '@unhead/shared'
import { resolveUnrefHeadInput } from './utils'

export const VueReactivityPlugin = defineHeadPlugin({
  hooks: {
    'entries:resolve': (ctx) => {
      for (const entry of ctx.entries)
        entry.input = resolveUnrefHeadInput(entry.input)
    },
  },
})
