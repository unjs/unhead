---
title: Site Search
description: Learn how to implement Schema.org markup for site search functionality.
---

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

```ts
import { defineSearchAction, defineWebSite, useSchemaOrg } from '@unhead/schema-org/@framework'

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

## Define your Search Results Page

Using your [WebPage](/docs/schema-org/api/schema/webpage) Schema, you can define the page as a search results page.

```ts
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineWebPage({
    '@type': ['CollectionPage', 'SearchResultsPage'],
  })
])
```

## Related Recipes

- [Setting Up Your Identity](/docs/schema-org/guides/recipes/identity) - Define your organization
- [Breadcrumbs](/docs/schema-org/guides/recipes/breadcrumbs) - Navigation breadcrumbs
- [eCommerce](/docs/schema-org/guides/recipes/e-commerce) - Product structured data
