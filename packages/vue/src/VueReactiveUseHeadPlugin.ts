import { defineHeadPlugin } from 'unhead'
import { resolveUnrefHeadInput } from './utils'

export const VueReactiveUseHeadPlugin = () => {
  return defineHeadPlugin({
    hooks: {
      'entries:resolve': function (ctx) {
        for (const entry of ctx.entries) {
          entry.resolvedInput = resolveUnrefHeadInput({ ...entry.input })
        }
      },
    },
  })
}
