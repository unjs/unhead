---
title: Schema.org for a Blog
navigation:
    title: Blog
---

Creating a blog is a fun way to share what you learn and grow a following through organic traffic.

Providing Schema.org can help improve your search appearance click-throughs rates
by helping Google optimise how your site is shown.

## Useful Links

- [Article | Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/article)
- [Article Schema | Yoast](https://developer.yoast.com/features/schema/pieces/article)

## Marking up an Article

The [defineArticle](/schema-org/schema/article) function and [SchemaOrgArticle](/schema-org/guides/components) component are provided
to create Article Schema whilst handling relations for you.

Note that some fields may already be inferred, see [Route Meta Resolving](/guide/getting-started/how-it-works#route-meta-resolving)

::code-group

```ts [Composition API]
useSchemaOrg([
  defineArticle({
    // name and description can usually be inferred
    image: '/photos/16x9/photo.jpg',
    datePublished: new Date(2020, 1, 1),
    dateModified: new Date(2020, 1, 1),
  })
])
```

```vue [Component API]
<template>
  <SchemaOrgArticle
    image="/photos/16x9/photo.jpg"
    :date-published="new Date(2020, 1, 1)"
    :date-modified="new Date(2020, 1, 1)"
  />
</template>
```
::

## Specifying the Article Type

Providing a type of Article can help clarify what kind of content the page is about.

The most common types are: `BlogPosting` and `NewsArticle`.

::code-group

```ts [Composition API]
useSchemaOrg([
  defineArticle({
    '@type': 'BlogPosting',
    // ...
  })
])
```

```vue [Component API]
<template>
  <SchemaOrgArticle
    type="BlogPosting"
  />
</template>
```

::

See the [Article Types](/schema-org/schema/article#sub-types) for the list of available types.

## Providing an author

If the author of the article isn't the [site identity](/schema-org/guides/identity), then you'll need to 
config the author or authors.

When defining a Person when an Article is present, it will automatically associate them as the author.

::code-group

```ts [Composition API]
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

```vue [Component API]
<template>
  <SchemaOrgArticle
    headline="My Article"
  />
  <SchemaOrgPerson name="John doe" url="https://johndoe.com" />
  <SchemaOrgPerson name="Jane doe" url="https://janedoe.com" />
</template>
```
::

## Markup Blog Archive Pages

Assuming you have the `WebPage` and `WebSite` schema loaded in from a parent layout component,
you can augment the `WebPage` type to better indicate the purpose of the page.

See [CollectionPage](https://schema.org/CollectionPage) for more information.

::code-group

```ts [Composition API]
useSchemaOrg([
  defineWebPage({
    '@type': 'CollectionPage'
  }),
])
```

```vue [Component API]
<template>
  <SchemaOrgWebPage
    type="CollectionPage"
  />
</template>
```
::
