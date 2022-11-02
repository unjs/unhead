import { defineHeadPlugin } from 'unhead'
import { resolveUnrefHeadInput } from './utils'

export const resolveVueInputPlugin = defineHeadPlugin({
  hooks: {
    'entries:resolve': function ({ entries }) {
      for (const k in entries)
        entries[k].input = resolveUnrefHeadInput(entries[k].input)
    },
  },
})
