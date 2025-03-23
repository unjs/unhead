---
title: Schema.org Breadcrumbs
navigation:
  title: Breadcrumbs
---

Creating breadcrumbs on your site is a great way to help your users understand your website hierarchy.

## Useful Links

- [Breadcrumb | Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/breadcrumb)
- [Breadcrumb | Yoast](https://developer.yoast.com/features/schema/pieces/breadcrumb)

## Marking up Breadcrumbs

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

## Adding Multiple Breadcrumbs

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
