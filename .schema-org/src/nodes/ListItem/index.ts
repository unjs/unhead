import type { Thing } from '../../types'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { resolveWithBase } from '../../utils'

/**
 * A list item, e.g. a step in a checklist or how-to description.
 */
export interface ListItemSimple extends Thing {
  '@type'?: 'ListItem'
  /**
   *  The name of the page in question, as it appears in the breadcrumb navigation.
   */
  name?: string
  /**
   * The unmodified canonical URL of the page in question.
   * - If a relative path is provided, it will be resolved to absolute.
   * - Item is not required for the last entry
   */
  item?: string | Thing
  /**
   *  An integer (starting at 1), counting the 'depth' of the page from (including) the homepage.
   */
  position?: number
}

export interface ListItem extends ListItemSimple {}

export const listItemResolver = defineSchemaOrgResolver<ListItem>({
  cast(node) {
    if (typeof node === 'string') {
      node = {
        name: node,
      }
    }
    return node
  },
  defaults: {
    '@type': 'ListItem',
  },
  resolve(node, ctx) {
    if (typeof node.item === 'string')
      node.item = resolveWithBase(ctx.meta.host, node.item as string)
    else if (typeof node.item === 'object')
      node.item = resolveRelation(node.item, ctx)

    return node
  },
})
