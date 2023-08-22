## Schema.org WebPage

- **Type**: `defineWebPage(input?: WebPage)`{lang="ts"}

  Describes a single page on a WebSite. Acts as a container for sub-page elements (such as Article).

  Acts as a connector from a page's content to the parent WebSite (and in turn, to the Organization).

- **Component**: `SchemaOrgWebPage` _(see [how components work](/guide/guides/components))_

## Useful Links

- [Schema.org WebPage](https://schema.org/WebPage)
- [Schema Inheritance](/guide/getting-started/how-it-works#schema-inheritance)

## Required properties

- **name** `string`

  The title of the page.

  A name can be provided using route meta on the `title` key, see [defaults](#defaults).

## Defaults

- **@type**: inferred from path, fallbacks to `WebPage`, see [resolves](#resolves)
- **@id**: `${canonicalUrl}#webpage`
- **url**: `canonicalUrl`
- **name**: `currentRouteMeta.title` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **isPartOf**: WebSite reference

Home page only
- **about**: Identity Reference 
- **primaryImageOfPage**: Logo reference

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

[WebPage](/schema/webpage)

- sets `potentialAction` to `ReadAction`
- sets `dateModified` to articles `dateModified`
- sets `datePublished` to articles `datePublished`

## Resolves

- `dateModified` or `datePublished` can be resolved from Date objects 

```ts
defineWebPage({
  // will resolve to ISO 8601 format
  datePublished: new Date(2020, 10, 1)
})
```

- providing a single string of `@type` which isn't `WebPage` will convert it to an array `TechArticle` -> `['WebPage', 'AboutPage']`

```ts
defineWebPage({
  // will be resolved as ['WebPage', 'AboutPage']
  '@type': 'AboutPage',
})
```

- @type based on last URL path

  -- `/about`, `/about-us` -> `AboutPage`

  -- `/search` -> `SearchResultsPage`

  -- `/checkout` -> `CheckoutPage`

  -- `/contact`, `/get-in-touch`, `/contact-us` -> `ContactPage`

  -- `/faq` -> `FAQPage`


## Example

```ts
defineWebPage({
  name: 'Page Title',
  image: '/image.jpg',
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
   * A reference-by-ID to the Organisation node.
   * Note: Only for the home page.
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
   * A reference-by-ID to a node representing the page's breadrumb structure.
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
   * Potential actions for this web page.
   *
   * Note it's on by default for most page types.
   */
  potentialAction?: Arrayable<(ReadAction | unknown)>
}
```
