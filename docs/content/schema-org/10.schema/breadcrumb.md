## Schema.org Breadcrumb

- **Type**: `defineBreadcrumb(input?: Breadcrumb)`{lang="ts"}

  Describes an `Breadcrumb` on a `WebPage`.

- **Component**: `SchemaOrgBreadcrumb` _(see [how components work](/guide/guides/components))_

## Useful Links

- [BreadcrumbList - Schema.org ](https://schema.org/BreadcrumbList)
- [Breadcrumb Schema Markup - Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/breadcrumb)
- [Breadcrumb - Yoast](https://developer.yoast.com/features/schema/pieces/breadcrumb)
- [Recipe: Breadcrumbs](/guide/recipes/breadcrumbs)

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

[WebPage](/schema/webpage)

- sets default `breadcrumb` to this node

## Resolves

- `itemListElement.position` is computed for each list element


## Types

```ts
/**
 * A BreadcrumbList is an ItemList consisting of a chain of linked Web pages,
 * typically described using at least their URL and their name, and typically ending with the current page.
 */
export interface BreadcrumbSimple extends ItemList {}
```
