import type { HeadPluginInput } from 'unhead'

/**
 * Unhead plugin that propagates source location metadata from entry options to tags.
 * Used in dev mode for devtools source tracing.
 *
 * When the Vite transform injects `_source` into `useHead()` options, this plugin
 * ensures that metadata flows through to each resolved tag so the devtools can
 * display which file:line created each tag.
 */
export function devtoolsPlugin(): HeadPluginInput {
  return {
    key: 'devtools',
    hooks: {
      'entries:normalize': function ({ tags, entry }) {
        const source = entry.options?._source
        if (!source)
          return
        for (const tag of tags) {
          if (!tag._source)
            tag._source = source
        }
      },
    },
  }
}
