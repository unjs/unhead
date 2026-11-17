---
title: "WebSite Schema Markup: JSON-LD Example and API"
description: Add WebSite schema markup with defineWebSite(). See the JSON-LD that Unhead renders and how the WebSite node connects to your pages and publisher.
navigation:
  title: WebSite
---

WebSite structured data names your site and connects it to its publisher and pages. Google reads WebSite markup on the home page to choose the [site name](https://developers.google.com/search/docs/appearance/site-names) that it shows in search results.

## JSON-LD Example

Unhead renders this JSON-LD for the [example](#example). It sets `url` to the canonical host and `inLanguage` from page metadata.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": "https://example.com/#website",
      "@type": "WebSite",
      "inLanguage": "en-AU",
      "name": "My Site",
      "url": "https://example.com/"
    }
  ]
}
```

## Schema.org WebSite

- **Type**: `defineWebSite<T extends Record<string, any>>(input?: WebSite & T)`{lang="ts"}

  Describes a website and its relationship to its WebPage nodes.

## Useful Links

- [Schema.org WebSite](https://schema.org/WebSite)

## Required properties

- **name** `string`

  The name of the website. Supply it directly; the WebSite resolver does not inherit the page title.

## Defaults

- **@type**: `WebSite`
- **@id**: `${canonicalHost}#website`
- **url**: `canonicalHost`
- **inLanguage**: `inLanguage` from resolved page metadata _(see: [Schema.org Params](/docs/schema-org/guides/core-concepts/params))_
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
  datePublished?: ResolvableDate
  /**
   * The date the website was last modified.
   */
  dateModified?: ResolvableDate
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
