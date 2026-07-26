---
title: ItemList Schema - JSON-LD Guide & Examples
description: Add ItemList structured data with Unhead. Create ordered lists and eligible Google carousels for courses, movies, recipes, and restaurants.
navigation:
  title: ItemList
---

ItemList schema represents an ordered or unordered list of items. [Google supports host carousel markup](https://developers.google.com/search/docs/appearance/structured-data/carousel) when ItemList is combined with Course, Movie, Recipe, or Restaurant items.

## JSON-LD Example

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "https://example.com/recipes/apple-pie"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "url": "https://example.com/recipes/banana-bread"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "url": "https://example.com/recipes/carrot-cake"
    }
  ]
}
```

::tip{icon="i-heroicons-wrench-screwdriver"}
Use the [Schema.org Generator](/tools/schema-generator) to build your structured data visually.
::

## Schema.org ItemList

- **Type**: `defineItemList<T extends Record<string, any>>(input?: ItemList & T)`{lang="ts"}

An ItemList represents an ordered or unordered list, primarily for breadcrumbs and carousels.

## Useful Links

- [ItemList - Schema.org](https://schema.org/ItemList)
- [Carousel - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/carousel)

## Required properties

- **itemListElement** `NodeRelations<ListItem>`

  The item list elements.

## Defaults and resolves

- `@type` defaults to `ItemList`, and a root list receives an ID such as `${canonicalUrl}#/schema/item-list/{n}`.
- Each nested ListItem receives a one-based `position` when it does not already have one.

## Types

```ts
export interface ItemListSimple extends Thing {
  /**
   * Resolved item list
   */
  itemListElement: NodeRelations<ListItem>
  /**
   * Type of ordering (e.g., Ascending, Descending, Unordered).
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

- [Breadcrumb](/docs/schema-org/api/schema/breadcrumb): Navigation lists
- [Product](/docs/schema-org/api/schema/product): Product lists
- [Article](/docs/schema-org/api/schema/article): Article lists
