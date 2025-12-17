import { defineSchemaOrgResolver } from '../../../core'

export interface ReadActionInput {
  target?: string[]
}

export interface ReadAction {
  '@type'?: 'ReadAction'
  /**
   * An array of string URLs which describes the URL pattern of the read action
   * (e.g., /search?query={search_term_string}).
   */
  'target': string[]
}

export const readActionResolver = defineSchemaOrgResolver<ReadAction>({
  defaults: {
    '@type': 'ReadAction',
  },
  resolve(node, ctx) {
    if (!node.target.includes(ctx.meta.url))
      node.target.unshift(ctx.meta.url)
    return node
  },
})
