import { defineSchemaOrgResolver } from '../../../core'

export interface ReadActionInput {
  target?: string[]
}

export interface ReadAction {
  '@type'?: 'ReadAction'
  /**
   * An object of type EntryPoint, with a relative URL which describes the URL pattern of the internal search function
   * (e.g., /search?query={search_term_string}).
   */
  target: string[]
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
