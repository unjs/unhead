---
title: "Breadcrumb Schema: BreadcrumbList JSON-LD Example"
description: Add breadcrumb schema with defineBreadcrumb(). See the BreadcrumbList JSON-LD that Unhead renders, the required itemListElement, and positions.
navigation:
  title: Breadcrumb
---

[Breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) uses a `BreadcrumbList` to describe the position of a page in the site hierarchy. Google uses breadcrumb markup to categorize the page in search results.

## JSON-LD Example

Unhead renders this JSON-LD for the [minimal example](#minimal). It converts relative paths to absolute URLs and adds the `position` of each item.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": "https://example.com/blog/my-article#breadcrumb",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "name": "Home",
          "item": "https://example.com",
          "position": 1
        },
        {
          "@type": "ListItem",
          "name": "Blog",
          "item": "https://example.com/blog",
          "position": 2
        },
        {
          "@type": "ListItem",
          "name": "My Article",
          "position": 3
        }
      ]
    }
  ]
}
```

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
