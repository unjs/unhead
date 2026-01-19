---
title: WebSite Schema
description: Use defineWebSite() to add WebSite structured data. Establish your site identity and enable sitelinks search box in Google search results.
---

## Schema.org WebSite

- **Type**: `defineWebSite(input?: WebSite)`{lang="ts"}

  Describes a WebSite. Parent to WebPage.

## Useful Links

- [Schema.org WebSite](https://schema.org/WebSite)

## Required properties

- **name** `string`

  The title of the page.

  A name can be provided using route meta on the `title` key, see [defaults](#defaults).

## Defaults

- **@type**: `WebSite`
- **@id**: `${canonicalHost}#website`
- **url**: `canonicalHost`
- **inLanguage**: `options.defaultLanguage` _(see: [user Config](/docs/schema-org/guides/core-concepts/params))_
- **publisher**: Identity reference

## Example

```ts
defineWebSite({
  name: 'My Site',
})
```

## Types

```ts
/**
 * A WebSite is a set of related web pages and other items typically served from a single web domain and accessible via URLs.
 */
export interface WebSiteSimple extends Thing {
  /**
   * The site's home URL (excluding a trailing slash).
   */
  url?: string
  /**
   * The name of the website.
   */
  name: string
  /**
   * A description of the website (e.g., the site's tagline).
   */
  description?: string
  /**
   * The date the website was first published.
   */
  datePublished?: string
  /**
   * The date the website was last modified.
   */
  dateModified?: string
  /**
   * A reference-by-ID to the Organization which publishes the WebSite
   * (or an array of Organization and Person in the case that the website represents an individual).
   */
  publisher?: NodeRelations<Identity>
  /**
   * A SearchAction object describing the site's internal search.
   */
  potentialAction?: Arrayable<(SearchAction | unknown)>
  /**
   * The language code for the WebSite; e.g., en-GB.
   * If the website is available in multiple languages, then output an array of inLanguage values.
   */
  inLanguage?: Arrayable<string>
}
```
