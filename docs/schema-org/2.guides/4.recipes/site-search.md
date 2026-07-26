---
title: Site Search
description: 'Add a SearchAction to WebSite schema with defineSearchAction() and describe your internal search URL template.'
---

If your site offers a search function, you can describe it with a SearchAction on the WebSite node. [Google removed the sitelinks search box in November 2024](https://developers.google.com/search/blog/2024/10/sitelinks-search-box), so this markup no longer creates that visual feature or affects Google rankings.

## Useful Links

- [Sitelinks search box removal](https://developers.google.com/search/blog/2024/10/sitelinks-search-box)
- [SearchAction - Schema.org](https://schema.org/SearchAction)

## Define a Search Action

Add `defineSearchAction()` to the primary WebSite node's `potentialAction`. Its URL template must contain `{search_term_string}`, which is replaced with the visitor's query.

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

Set the [WebPage](/docs/schema-org/api/schema/webpage) type to `SearchResultsPage` for the search results route.

```ts
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineWebPage({
    '@type': ['CollectionPage', 'SearchResultsPage'],
  })
])
```

## Related Recipes

- [Setting Up Your Identity](/docs/schema-org/guides/recipes/identity): Define your organization
- [Breadcrumbs](/docs/schema-org/guides/recipes/breadcrumbs): Navigation breadcrumbs
- [E-commerce](/docs/schema-org/guides/recipes/e-commerce): Product structured data
