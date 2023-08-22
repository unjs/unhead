## Schema.org ItemList

- **Type**: `defineItemList(input?: ItemList)`{lang="ts"}

A list of items of any sort. Used for breadcrumbs and carousals mainly.

- **Component**: `SchemaOrgItemList` _(see [how components work](/guide/guides/components))_

## Useful Links

- [ItemList - Schema.org](https://schema.org/ItemList)
- [Carousal - Google](https://developers.google.com/search/docs/advanced/structured-data/carousel)

## Required properties

- **itemListElement** `ListItem`

  The item list elements.

## Types

```ts
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
```
