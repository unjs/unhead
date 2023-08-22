import type { NodeRelations, Thing } from '../../types'
import type { ListItem } from '../ListItem'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { listItemResolver } from '../ListItem'
import { setIfEmpty } from '../../utils'

export interface ItemListSimple extends Thing {
  /**
   * Resolved item list
   */
  itemListElement: NodeRelations<ListItem>
  /**
   * Type of ordering (e.g. Ascending, Descending, Unordered).
   *
   * @default undefined
   */
  itemListOrder?: 'Ascending' | 'Descending' | 'Unordered'
  /**
   * The number of items in an ItemList.
   * Note that some descriptions might not fully describe all items in a list (e.g., multi-page pagination);
   * in such cases, the numberOfItems would be for the entire list.
   *
   * @default undefined
   */
  numberOfItems?: number
}

export interface ItemList extends ItemListSimple {}

export const itemListResolver = defineSchemaOrgResolver<ItemList>({
  defaults: {
    '@type': 'ItemList',
  },
  resolve(node, ctx) {
    if (node.itemListElement) {
      let index = 1

      node.itemListElement = resolveRelation(node.itemListElement, ctx, listItemResolver, {
        array: true,
        afterResolve(node) {
          setIfEmpty(node, 'position', index++)
        },
      })
    }
    return node
  },
})
