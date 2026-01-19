---
title: Schema.org Breadcrumbs
description: 'Add BreadcrumbList structured data with defineBreadcrumb(). Display clickable navigation paths instead of URLs in Google search results.'
navigation:
  title: Breadcrumbs
---

Use `defineBreadcrumb()` with an array of `{ name, item }` objects to create breadcrumb navigation markup. Google displays this as a clickable path in search results instead of showing the raw URL.

::note
Breadcrumb structured data replaces URLs in search results with a readable navigation path (Home > Category > Page), helping users understand your site hierarchy.
::

## Useful Links

- [Breadcrumb | Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/breadcrumb)
- [Breadcrumb | Yoast](https://developer.yoast.com/features/schema/pieces/breadcrumb)

## How do I mark up breadcrumbs?

[defineBreadcrumb](/docs/schema-org/api/schema/breadcrumb) creates Breadcrumb Schema whilst handling relations for you.

Imagine we want to generate the following markup with the appropriate Schema.

Note: Google recommends that the markup for the breadcrumbs should exist on the page matching the Schema.org entry.

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

Here's an example of how you might structure your breadcrumbs in HTML:

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

There may be some cases where you'd like multiple breadcrumbs to be displayed.

For these cases you can provide an `@id` and it will avoid overwriting the primary breadcrumb.

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

- [Blog Posts](/docs/schema-org/guides/recipes/blog) - Article structured data
- [E-Commerce](/docs/schema-org/guides/recipes/e-commerce) - Product structured data
