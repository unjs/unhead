import { defineHeadPlugin } from '@unhead/shared'
import { resolveUnrefHeadInput } from './utils'

export function VueReactiveUseHeadPlugin() {
  return defineHeadPlugin({
    hooks: {
      'entries:resolve': function (ctx) {
        for (const entry of ctx.entries)
          entry.resolvedInput = resolveUnrefHeadInput(entry.input)
      },
    },
  })
}
