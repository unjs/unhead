---
title: Schema.org for a Blog
description: 'Add Article or BlogPosting structured data with defineArticle() so search engines can understand a post and its author, dates, and images.'
navigation:
    title: Blog
---

Use `defineArticle()` with `@type: 'BlogPosting'` to mark up blog posts. [Article structured data can help Google understand the author, publication date, and representative images](https://developers.google.com/search/docs/appearance/structured-data/article).

::note
Article markup can affect how Google understands title text, images, and date information, but it does not guarantee a particular search appearance.
::

## Useful Links

- [Article - Schema.org](https://schema.org/Article)
- [Article | Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/article)

## How do I mark up a blog article?

The [defineArticle](/docs/schema-org/api/schema/article) helper creates an Article node and handles its supported relationships.

Some fields may already be inferred. See [Schema.org Params](/docs/schema-org/guides/core-concepts/params).

```ts
import { defineArticle, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineArticle({
    // name and description can usually be inferred
    image: '/photos/16x9/photo.jpg',
    datePublished: new Date('2020-02-01T00:00:00.000Z'),
    dateModified: new Date('2020-02-01T00:00:00.000Z'),
  })
])
```

## How do I specify the article type?

Set `@type` to describe the kind of article. The most common choices are `BlogPosting` and `NewsArticle`.

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

Set `author` when an article's author differs from the [site identity](/docs/schema-org/guides/recipes/identity).

When a Person and an Article are registered together, the Person becomes the Article's author if the Article does not already have one.

```ts
import { defineArticle, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineArticle({
    headline: 'My Article',
    author: [
      {
        name: 'John Doe',
        url: 'https://johndoe.com',
      },
      {
        name: 'Jane Doe',
        url: 'https://janedoe.com',
      },
    ]
  })
])
```

## How do I mark up blog archive pages?

If a parent layout already defines `WebPage` and `WebSite`, set the page type to `CollectionPage` for a blog archive.

See [CollectionPage](https://schema.org/CollectionPage) for more information.

```ts
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineWebPage({
    '@type': 'CollectionPage'
  }),
])
```

## Expected JSON-LD Output

Combining the fields shown above, with a host of `https://example.com` and a page path of `/blog/my-post`, produces JSON-LD like this:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Article", "BlogPosting"],
      "@id": "https://example.com/blog/my-post#article",
      "headline": "My Article",
      "image": { "@id": "https://example.com/#/schema/image/1" },
      "datePublished": "2020-02-01T00:00:00.000Z",
      "dateModified": "2020-02-01T00:00:00.000Z",
      "author": [
        { "@id": "https://example.com/#/schema/person/1" },
        { "@id": "https://example.com/#/schema/person/2" }
      ],
      "thumbnailUrl": "https://example.com/photos/16x9/photo.jpg"
    },
    {
      "@type": "Person",
      "@id": "https://example.com/#/schema/person/2",
      "name": "Jane Doe",
      "url": "https://janedoe.com"
    },
    {
      "@type": "Person",
      "@id": "https://example.com/#/schema/person/1",
      "name": "John Doe",
      "url": "https://johndoe.com"
    },
    {
      "@type": "ImageObject",
      "@id": "https://example.com/#/schema/image/1",
      "contentUrl": "https://example.com/photos/16x9/photo.jpg",
      "url": "https://example.com/photos/16x9/photo.jpg"
    }
  ]
}
```

## Common Issues

### Missing `image` warning

Google recommends one or more representative images for Article markup. Provide `image` when the page has a suitable image.

### `datePublished` format errors

Pass a JavaScript `Date` object and Unhead will serialize it as ISO 8601.

### Author not showing

To use the site identity as the author, call `defineOrganization()` or `definePerson()` in the layout.

## Related Recipes

- [Setting Up Your Identity](/docs/schema-org/guides/recipes/identity): Define your organization/person
- [Breadcrumbs](/docs/schema-org/guides/recipes/breadcrumbs): Add navigation breadcrumbs
- [FAQ Page](/docs/schema-org/guides/recipes/faq): Add FAQ structured data
