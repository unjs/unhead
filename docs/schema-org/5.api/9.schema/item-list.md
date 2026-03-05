---
title: ItemList Schema - JSON-LD Guide & Examples
description: Add ItemList structured data with Unhead. JSON-LD examples for carousels, ranked lists, and product collections with Google rich result support.
navigation:
  title: ItemList
---

ItemList schema represents an ordered or unordered list of items. Google uses it to display carousel rich results for recipes, products, courses, and other list-based content.

### JSON-LD Example

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "https://example.com/best-phones/iphone"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "url": "https://example.com/best-phones/pixel"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "url": "https://example.com/best-phones/galaxy"
    }
  ]
}
```

With Unhead, generate this using the `defineItemList()` composable — see the [API reference](#schema-org-itemlist) below.

::tip{icon="i-heroicons-wrench-screwdriver"}
Use the [Schema.org Generator](/tools/schema-generator) to build your structured data visually.
::

## Schema.org ItemList

- **Type**: `defineItemList(input?: ItemList)`{lang="ts"}

A list of items of any sort. Mainly used for breadcrumbs and carousels.

## Useful Links

- [ItemList - Schema.org](https://schema.org/ItemList)
- [Carousel - Google](https://developers.google.com/search/docs/advanced/structured-data/carousel)

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

## Related Schemas

- [Breadcrumb](/docs/schema-org/api/schema/breadcrumb) - Navigation lists
- [Product](/docs/schema-org/api/schema/product) - Product lists
- [Article](/docs/schema-org/api/schema/article) - Article lists
