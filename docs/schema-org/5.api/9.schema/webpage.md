---
title: WebPage Schema
description: Use defineWebPage() to add WebPage structured data. Connect page content to your site hierarchy with automatic page type detection.
---

## Schema.org WebPage

- **Type**: `defineWebPage<T extends Record<string, any>>(input?: WebPage & T)`{lang="ts"}

  Describes a single page, connects its content to the parent WebSite, and can contain nodes such as Article.

## Useful Links

- [Schema.org WebPage](https://schema.org/WebPage)

## Recommended properties

- **name** `string`

  The title of the page.

  Route metadata on the `title` key can provide this value; see [Defaults](#defaults).

## Defaults

- **@type**: inferred from the final path segment; falls back to `WebPage`, see [resolves](#resolves)
- **@id**: `${canonicalUrl}#webpage`
- **url**: `canonicalUrl`
- **name**: page title from resolved metadata
- **isPartOf**: WebSite reference

- **about**: Identity reference on the homepage when an identity is registered
- **primaryImageOfPage**: Logo reference when an Organization logo is registered

## Sub-Types

- `AboutPage`
- `CheckoutPage`
- `CollectionPage`
- `ContactPage`
- `FAQPage`
- `ItemPage`
- `MedicalWebPage`
- `ProfilePage`
- `QAPage`
- `RealEstateListing`
- `SearchResultsPage`

## Relation Transforms

[WebPage](/docs/schema-org/api/schema/webpage)

- sets `potentialAction` to `ReadAction` for a plain WebPage; Article also adds a ReadAction when connected
- copies an Article's `dateModified` and `datePublished` values to the WebPage when those page fields are empty

## Resolves

- `dateModified` or `datePublished` can be resolved from Date objects

```ts
defineWebPage({
  // will resolve to ISO 8601 format
  datePublished: new Date(2020, 10, 1)
})
```

- providing a single `@type` other than `WebPage` converts it to an array: `AboutPage` becomes `['WebPage', 'AboutPage']`

```ts
defineWebPage({
  // will be resolved as ['WebPage', 'AboutPage']
  '@type': 'AboutPage',
})
```

### Types inferred from paths

Unhead can infer a page subtype from the final URL path segment:

- `/about`, `/about-us` → `AboutPage`
- `/search` → `SearchResultsPage`
- `/checkout` → `CheckoutPage`
- `/contact`, `/get-in-touch`, `/contact-us` → `ContactPage`
- `/faq` → `FAQPage`

## Example

```ts
defineWebPage({
  name: 'Page Title',
  primaryImageOfPage: '/image.jpg',
})
```

## Types

```ts
/**
 * A web page.
 * Every web page is implicitly assumed to be declared to be of type WebPage,
 * so the various properties about that webpage, such as breadcrumb may be used.
 */
type ValidSubTypes = 'WebPage' | 'AboutPage' | 'CheckoutPage' | 'CollectionPage' | 'ContactPage' | 'FAQPage' | 'ItemPage' | 'MedicalWebPage' | 'ProfilePage' | 'QAPage' | 'RealEstateListing' | 'SearchResultsPage'

/**
 * A web page.
 * Every web page is implicitly assumed to be declared to be of type WebPage,
 * so the various properties about that webpage, such as breadcrumb may be used.
 */
export interface WebPageSimple extends Thing {
  ['@type']?: Arrayable<ValidSubTypes>
  /**
   * The unmodified canonical URL of the page.
   */
  url?: string
  /**
   * The title of the page.
   */
  name?: string
  /**
   * The page's meta description content.
   */
  description?: string
  /**
   * A reference-by-ID to the WebSite node.
   */
  isPartOf?: NodeRelation<WebSite>
  /**
   * A reference-by-ID to the Organization node.
   */
  about?: NodeRelation<Organization>
  /**
   * A reference-by-ID to the author of the web page.
   */
  author?: NodeRelation<Person | string>
  /**
   * The language code for the page; e.g., en-GB.
   */
  inLanguage?: Arrayable<string>
  /**
   * The time at which the page was originally published, in ISO 8601 format; e.g., 2015-10-31T16:10:29+00:00.
   */
  datePublished?: ResolvableDate
  /**
   * The time at which the page was last modified, in ISO 8601 format; e.g., 2015-10-31T16:10:29+00:00.
   */
  dateModified?: ResolvableDate
  /**
   * A reference-by-ID to a node representing the page's featured image.
   */
  primaryImageOfPage?: NodeRelation<ImageObject | string>
  /**
   * A reference-by-ID to a node representing the page's breadcrumb structure.
   */
  breadcrumb?: NodeRelation<BreadcrumbList>
  /**
   * An array of all videos in the page content, referenced by ID.
   */
  video?: NodeRelations<VideoObject>
  /**
   * A SpeakableSpecification object which identifies any content elements suitable for spoken results.
   */
  speakable?: unknown
  /**
   * The time at which the page was last reviewed, in ISO 8601 format.
   */
  lastReviewed?: string
  /**
   * An array of keywords describing the page.
   */
  keywords?: string[]
  /**
   * Potential actions for this web page.
   *
   * Note it's on by default for most page types.
   */
  potentialAction?: Arrayable<(ReadAction | unknown)>
}
```
