---
title: Article Schema - JSON-LD Guide & Examples
description: Implement Article structured data with Unhead. JSON-LD examples for BlogPosting, NewsArticle, TechArticle with datePublished and author markup.
navigation:
  title: Article
---

[Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article) identifies written content such as blog posts, news articles, and technical documentation. It can help Google understand authorship, publication dates, representative images, and content type.

## JSON-LD Example

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Build a REST API with Node.js",
  "image": "https://example.com/photos/api-guide.jpg",
  "datePublished": "2026-01-15T08:00:00+00:00",
  "dateModified": "2026-02-20T10:30:00+00:00",
  "author": {
    "@type": "Person",
    "name": "Jane Smith",
    "url": "https://example.com/authors/jane"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Dev Blog",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  }
}
```

::tip{icon="i-heroicons-wrench-screwdriver"}
Use the [Schema.org Generator](/tools/schema-generator) to build your structured data visually.
::

## Schema.org Article

- **Type**: `defineArticle<T extends Record<string, any>>(input?: Article & T)`{lang="ts"}

  Describes an `Article` on a `WebPage`.

## Useful Links

- [Article - Schema.org](https://schema.org/Article)
- [Article Schema Markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Recipe: Blog](/docs/schema-org/guides/recipes/blog)

## Recommended properties for Google

- **headline** `string`

  Name of the article

  Route metadata on the `title` key can provide this value; see [Defaults](#defaults).

- **image** `Arrayable<string|ImageObject>`

  Link a primary image or a collection of images to the article.

  Route metadata on the `image` key can provide a single image URL; see [Defaults](#defaults).

  For Google Search, use crawlable images that represent the article. Google recommends several high-resolution images with 16:9, 4:3, and 1:1 aspect ratios; see the [current Article image guidelines](https://developers.google.com/search/docs/appearance/structured-data/article#article-types).

- **author** `NodeRelations<Identity>`

  If the article's author is not your site identity, provide the author explicitly. See [Choosing an identity](/docs/schema-org/guides/recipes/identity).

  The registered author is moved to a root Schema node, resolving the field as an `@id` reference to a [Person](/docs/schema-org/api/schema/person).

- **@type** [sub-types](#sub-types)

  Select the Article subtype that best matches the content.

## Defaults

- **@type**: `Article`
- **@id**: `${canonicalUrl}#article`
- **headline**: `title` from resolved page metadata _(see: [Schema.org Params](/docs/schema-org/guides/core-concepts/params))_
- **image**: `image` from resolved page metadata
- **description**: `description` from resolved page metadata
- **inLanguage**: `inLanguage` from resolved page metadata
- **datePublished**: `datePublished` from resolved page metadata
- **dateModified**: `dateModified` from resolved page metadata
- **publisher**: Identity Reference
- **author**: Identity Reference
- **isPartOf**: WebPage Reference
- **mainEntityOfPage**: WebPage Reference

## Sub-Types

- `AdvertiserContentArticle`
- `NewsArticle`
- `BlogPosting`
- `Report`
- `SatiricalArticle`
- `ScholarlyArticle`
- `SocialMediaPosting`
- `TechArticle`

## Relation Transforms

[WebPage](/docs/schema-org/api/schema/webpage)

- sets default `potentialAction` to `ReadAction`
- sets the default `dateModified` to the Article's `dateModified`
- sets the default `datePublished` to the Article's `datePublished`

## Resolves

See [Global Resolves](/docs/schema-org/guides/get-started/overview#how-does-schemaorg-get-page-data) for full context.

- `headline` is cut to a maximum of 110 characters at the last complete word that fits.

- `thumbnailUrl` will be set to the first image

- `dateModified` or `datePublished` can be resolved from Date objects

```ts
defineArticle({
  // will resolve to ISO 8601 format
  datePublished: new Date(2024, 0o5, 29)
})
```

- providing a single `@type` other than `Article` converts it to an array: `TechArticle` becomes `['Article', 'TechArticle']`

```ts
defineArticle({
  // will be resolved as ['Article', 'TechArticle']
  '@type': 'TechArticle',
})
```

## Examples

See the [blog](/docs/schema-org/guides/recipes/blog) recipe for more examples.

### Minimal

```ts
defineArticle({
  headline: 'Article Title',
  image: '/articles/article-title-image.jpg',
  // using identity as the author
})
```

### Route Meta

Add type support for route metadata.

```ts
defineArticle()
```

### Detailed example

```ts
defineArticle({
  headline: 'Article Title',
  description: 'Article description',
  image: '/articles/article-title-image.jpg',
  datePublished: new Date(2024, 0o5, 29),
  dateModified: new Date(2024, 0o5, 29),
  // attaching an author when the identity is an organization
  author: {
    name: 'Harlan Wilton',
    url: 'https://harlanzw.com',
  }
})
```

## Types

```ts
type ValidArticleSubTypes = 'Article' | 'BlogPosting' | 'AdvertiserContentArticle' | 'NewsArticle' | 'Report' | 'SatiricalArticle' | 'ScholarlyArticle' | 'SocialMediaPosting' | 'TechArticle'

export interface ArticleSimple extends Thing {
  ['@type']?: Arrayable<ValidArticleSubTypes>
  /**
   * The headline of the article (falling back to the title of the WebPage).
   * Headlines should not exceed 110 characters.
   */
  headline?: string
  /**
   * A summary of the article (falling back to the page's meta description content).
   */
  description?: string
  /**
   * A reference-by-ID to the WebPage node.
   */
  isPartOf?: IdReference
  /**
   * The time at which the article was originally published, in ISO 8601 format; e.g., 2015-10-31T16:10:29+00:00.
   */
  datePublished?: ResolvableDate
  /**
   * The time at which the article was last modified, in ISO 8601 format; e.g., 2015-10-31T16:10:29+00:00.
   */
  dateModified?: ResolvableDate
  /**
   * A reference-by-ID to the author of the article.
   */
  author?: NodeRelations<Identity>
  /**
   * A reference-by-ID to the publisher of the article.
   */
  publisher?: NodeRelations<Identity>
  /**
   * An array of all videos in the article content, referenced by ID.
   */
  video?: NodeRelations<VideoObject>
  /**
   * An image object or referenced by ID.
   * Google eligibility has additional image requirements; see the Article guide above.
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * An array of references by ID to comment pieces.
   */
  comment?: NodeRelations<Comment>
  /**
   * A thumbnail image relevant to the Article.
   */
  thumbnailUrl?: string
  /**
   * An integer value of the number of comments associated with the article.
   */
  commentCount?: number
  /**
   * An integer value of the number of words in the article.
   */
  wordCount?: number
  /**
   * An array of keywords which the article has (e.g., ["cats","dogs","cake"]).
   */
  keywords?: string[]
  /**
   * An array of category names which the article belongs to (e.g., ["cats","dogs","cake"]).
   */
  articleSection?: string[]
  /**
   * The language code for the article; e.g., en-GB.
   */
  inLanguage?: string
  /**
   * A SpeakableSpecification object which identifies any content elements suitable for spoken results.
   */
  speakable?: unknown
  /**
   * The year from which the article holds copyright status.
   */
  copyrightYear?: string
  /**
   * A reference-by-ID to the Organization or Person who holds the copyright.
   */
  copyrightHolder?: NodeRelations<Identity>
  /**
   * The body text of the article.
   */
  articleBody?: string
  /**
   * The subject matter of the article.
   */
  about?: string
}
```

## Related Schemas

- [Person](/docs/schema-org/api/schema/person): Article author
- [Organization](/docs/schema-org/api/schema/organization): Publisher
- [Breadcrumb](/docs/schema-org/api/schema/breadcrumb): Article navigation
