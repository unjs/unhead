import type { ResolvedHeadTag } from '@unhead/schema'
import { defineHeadPlugin } from '@unhead/shared'

export function SSRPayloadPlugin() {
  return defineHeadPlugin(head => ({
    hooks: {
      'ssr:render': (ctx) => {
        if (Object.keys(head.state).length) {
          ctx.tags.push({
            tag: 'script',
            tagPosition: 'bodyClose',
            props: {
              type: 'application/json',
              id: 'unhead-state',
            },
            innerHTML: JSON.stringify(head.state),
          } as unknown as ResolvedHeadTag)
        }
      },
    },
  }))
}
