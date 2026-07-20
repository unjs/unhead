---
title: Breadcrumb Schema
description: Use defineBreadcrumb() to add BreadcrumbList structured data that describes a page's position in the site hierarchy.
---

## Schema.org Breadcrumb

- **Type**: `defineBreadcrumb<T extends Record<string, any>>(input?: BreadcrumbList & T)`{lang="ts"}

  Describes a `BreadcrumbList` on a WebPage.

## Useful Links

- [BreadcrumbList - Schema.org](https://schema.org/BreadcrumbList)
- [Breadcrumb Schema Markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
- [Recipe: Breadcrumbs](/docs/schema-org/guides/recipes/breadcrumbs)

## Required properties

- **itemListElement**

  An array of `ListItem` objects, representing the position of the current page in the site hierarchy.

## Examples

### Minimal

```ts
defineBreadcrumb({
  itemListElement: [
    { name: 'Home', item: '/' },
    { name: 'Blog', item: '/blog' },
    { name: 'My Article' },
  ],
})
```

## Defaults

- **@type**: `BreadcrumbList`
- **@id**: `${canonicalUrl}#breadcrumb`

## Relation Transforms

[WebPage](/docs/schema-org/api/schema/webpage)

- sets default `breadcrumb` to this node

## Resolves

- `itemListElement.position` is computed for each list element

## Types

```ts
/**
 * A BreadcrumbList is an ItemList consisting of a chain of linked Web pages,
 * typically described using at least their URL and their name, and typically ending with the current page.
 */
export interface BreadcrumbSimple extends ItemList {
  '@type'?: 'BreadcrumbList'
}
```

## Related Schemas

- [ItemList](/docs/schema-org/api/schema/item-list): List structure
- [Article](/docs/schema-org/api/schema/article): Article navigation
- [Product](/docs/schema-org/api/schema/product): Product navigation
