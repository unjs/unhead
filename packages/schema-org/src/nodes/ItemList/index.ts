import type { NodeRelations, OptionalSchemaOrgPrefix, Thing } from '../../types'
import type { ListItem } from '../ListItem'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { setIfEmpty, withBase } from '../../utils'
import { listItemResolver } from '../ListItem'

type ItemListOrderType = 'ItemListOrderAscending' | 'ItemListOrderDescending' | 'ItemListUnordered'

const ITEM_LIST_ORDER_TYPES = new Set<string>(['ItemListOrderAscending', 'ItemListOrderDescending', 'ItemListUnordered'])

export interface ItemListSimple extends Thing {
  /**
   * Resolved item list
   */
  itemListElement: NodeRelations<ListItem>
  /**
   * Type of ordering. An ItemListOrderType value is expanded to the full Schema.org URL; other text is kept as is.
   *
   * @default undefined
   */
  itemListOrder?: OptionalSchemaOrgPrefix<ItemListOrderType> | (string & Record<never, never>)
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
    if (node.itemListOrder && ITEM_LIST_ORDER_TYPES.has(node.itemListOrder))
      node.itemListOrder = withBase(node.itemListOrder, 'https://schema.org/')
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
