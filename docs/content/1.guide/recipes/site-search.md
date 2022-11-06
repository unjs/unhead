---
title: Site Search
---

# Setting up Schema.org for Site Search in Vue

If your site offers a search function, you may like to define markup to help Google understand it.

## Useful Links

- [Sitelinks Searchbox](https://developers.google.com/search/docs/advanced/structured-data/sitelinks-searchbox)
- [SearchAction | Yoast](https://developer.yoast.com/features/schema/pieces/searchaction)

## Define a Search Action

To provide a search action for your WebSite, you need to insert a SearchAction in `potentialAction`.

To make configuring this easier, the function `defineSearchAction` is provided.

Make sure that you set place `{search_term_string}` somewhere in your URL.
This represents a query a user would be searching for.

This markup should go in your root Schema definition.

::code-group

```ts [Composition API]
useSchemaOrg([
  defineWebSite({
    potentialAction: [
     defineSearchAction({
       target: '/search?q={search_term_string}'
     })
    ]
  })
])
```

```vue [Component API]
<template>
  <SchemaOrgWebsite
    :potentialAction="[ defineSearchAction({ target: '/search?q={search_term_string}' }) ]"
  />
</template>
```
::

## Define your Search Results Page

Using your [WebPage](/schema/webpage) Schema, you can define the page as a search results page.

::code-group

```ts [Composition API]
useSchemaOrg([
  defineWebPage({
    '@type': ['CollectionPage', 'SearchResultsPage'],
  })
])
```

```vue [Component API]
<template>
  <SchemaOrgWebPage :type="['CollectionPage', 'SearchResultsPage']" />
</template>
```
::
