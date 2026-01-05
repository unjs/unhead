---
title: Schema.org for a Blog
navigation:
    title: Blog
---

Use `defineArticle()` with `@type: 'BlogPosting'` to mark up blog posts. This enables rich snippets showing author, publish date, and article images in search results.

::note
Schema.org Article markup helps Google display enhanced search results with author info, thumbnails, and publication dates - improving click-through rates.
::

## Useful Links

- [Article | Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/article)
- [Article Schema | Yoast](https://developer.yoast.com/features/schema/pieces/article)

## How do I mark up a blog article?

The [defineArticle](/docs/schema-org/api/schema/article) function is provided to create Article Schema whilst handling relations for you.

Note that some fields may already be inferred, see [Schema.org Params](/docs/schema-org/guides/core-concepts/params)

```ts
import { defineArticle, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineArticle({
    // name and description can usually be inferred
    image: '/photos/16x9/photo.jpg',
    datePublished: new Date(2020, 1, 1),
    dateModified: new Date(2020, 1, 1),
  })
])
```

## How do I specify the article type?

Providing a type of Article can help clarify what kind of content the page is about.

The most common types are: `BlogPosting` and `NewsArticle`.

```ts
import { defineArticle, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineArticle({
    '@type': 'BlogPosting',
    // ...
  })
])
```

See the [Article Types](/docs/schema-org/api/schema/article#sub-types) for the list of available types.

## How do I add an author?

If the author of the article isn't the [site identity](/docs/schema-org/guides/recipes/identity), then you'll need to
config the author or authors.

When defining a Person when an Article is present, it will automatically associate them as the author.

```ts
import { defineArticle, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineArticle({
    headline: 'My Article',
    author: [
      {
        name: 'John doe',
        url: 'https://johndoe.com',
      },
      {
        name: 'Jane doe',
        url: 'https://janedoe.com',
      },
    ]
  })
])
```

## How do I mark up blog archive pages?

Assuming you have the `WebPage` and `WebSite` schema loaded in from a parent layout component,
you can augment the `WebPage` type to better indicate the purpose of the page.

See [CollectionPage](https://schema.org/CollectionPage) for more information.

```ts
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineWebPage({
    '@type': 'CollectionPage'
  }),
])
```

## Related Recipes

- [Setting Up Your Identity](/docs/schema-org/guides/recipes/identity) - Define your organization/person
- [Breadcrumbs](/docs/schema-org/guides/recipes/breadcrumbs) - Add navigation breadcrumbs
- [FAQ Page](/docs/schema-org/guides/recipes/faq) - Add FAQ structured data
