---
title: How to Add Breadcrumb Markup to Your Pages
description: 'Mark up a breadcrumb trail with defineBreadcrumb(), match it to the visible navigation, and add a second trail with its own @id.'
navigation:
  title: Breadcrumbs
---

Use `defineBreadcrumb()` with an array of `{ name, item }` objects to create breadcrumb navigation markup. Google may use this markup to categorize a page in search results.

::tip
This recipe shows the steps. For the BreadcrumbList JSON-LD that Unhead renders, the required properties, and the types, see the [Breadcrumb schema reference](/docs/schema-org/api/schema/breadcrumb).
::

::note
Breadcrumb structured data describes a readable navigation path such as Home > Category > Page. Search appearance is not guaranteed.
::

## Useful Links

- [BreadcrumbList - Schema.org](https://schema.org/BreadcrumbList)
- [Breadcrumb | Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)

## How do I mark up breadcrumbs?

[defineBreadcrumb](/docs/schema-org/api/schema/breadcrumb) creates a BreadcrumbList node and handles its ListItem relationships.

The following example generates structured data for the matching visible breadcrumb navigation.

Google requires the breadcrumb markup to represent a typical user path to the page.

```ts
import { defineBreadcrumb, useSchemaOrg } from '@unhead/schema-org/@framework'

const breadcrumbs = [
  // item is the url and will be resolved to the absolute url
  { name: 'Home', item: '/' },
  { name: 'Articles', item: '/blog' },
  // item is not required for the last list element
  { name: 'How do breadcrumbs work' },
]

useSchemaOrg([
  defineBreadcrumb({
    itemListElement: breadcrumbs
  }),
])
```

The visible breadcrumb navigation can use the same items:

```html
<ul>
  <li>
    <a href="/">Home</a>
    <span>/</span>
  </li>
  <li>
    <a href="/blog">Articles</a>
    <span>/</span>
  </li>
  <li>
    <span>How do breadcrumbs work</span>
  </li>
</ul>
```

## How do I add multiple breadcrumb trails?

Give each additional trail its own `@id` so it does not overwrite the primary breadcrumb.

```ts
import { defineBreadcrumb, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  // primary breadcrumb
  defineBreadcrumb({
    itemListElement: [
      // item is the url and will be resolved to the absolute url
      { name: 'Home', item: '/' },
      { name: 'Articles', item: '/blog' },
      // item is not required for the last list element
      { name: 'How do breadcrumbs work' },
    ]
  }),
  defineBreadcrumb({
    '@id': '#secondary-breadcrumb',
    'itemListElement': [
      // item is the url and will be resolved to the absolute url
      { name: 'Sub Home', item: '/sub' },
      { name: 'Sub Page', item: '/sub/page' },
      { name: 'Sub Element' },
    ]
  }),
])
```

## Related Recipes

- [Blog Posts](/docs/schema-org/guides/recipes/blog): Article structured data
- [E-commerce](/docs/schema-org/guides/recipes/e-commerce): Product structured data
