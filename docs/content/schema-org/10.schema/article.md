## Schema.org Article

- **Type**: `defineArticle(input?: Article)`{lang="ts"}

  Describes an `Article` on a `WebPage`.

- **Component**: `SchemaOrgArticle` _(see [how components work](/guide/guides/components))_

## Useful Links

- [Article - Schema.org](https://schema.org/Article)
- [Article Schema Markup - Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/article)
- [Article - Yoast](https://developer.yoast.com/features/schema/pieces/article)
- [Recipe: Blog](/guide/recipes/blog)

## Required properties

- **headline** `string`

  Name of the article

  A name can be provided using route meta on the `title` key, see [defaults](#defaults).


- **image** `Arrayable<string|ImageObject>` 

  Link a primary image or a collection of images to used to the article. 

  A single image URL can be provided using route meta on the `image` key, see [defaults](#defaults). 

- **author** `AuthorInput` (conditional)

  If the author of the article is not your identity (see [Choosing an identity](/guide/guides/identity)) you will need to provide authors
  manually.

  The registered author is moved to a root Schema node, resolving the field as reference to a [Person](/schema/person).

## Recommended Properties

- **@type** [sub-types](#sub-types) 

  Select the most appropriate type for your content for the article.
 

## Defaults

- **@type**: `Article`
- **@id**: `${canonicalUrl}#article`
- **headline**: `currentRouteMeta.title` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **image**: `currentRouteMeta.image` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **description**: `currentRouteMeta.description` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **inLanguage**: `options.defaultLanguage` _(see: [user Config](/guide/guides/user-config))_
- **datePublished**: `currentRouteMeta.datePublished` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **dateModified**: `currentRouteMeta.dateModified` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
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

[WebPage](/schema/webpage)

- sets default `potentialAction` to `ReadAction`
- sets default `dateModified` to articles `dateModified`
- sets default `datePublished` to articles `datePublished`
- sets default `author` to articles `author`
- sets default `primaryImageOfPage` to articles first image

## Resolves

See [Global Resolves](/guide/getting-started/how-it-works#global-resolves) for full context.

- `headline` will be cut to a maximum length of 110 without breaking words.

- `thumbnailUrl` will be set to the first image

- `dateModified` or `datePublished` can be resolved from Date objects 

```ts
defineArticle({
  // will resolve to ISO 8601 format
  datePublished: new Date(2020, 10, 1)
})
```

- providing a single string of `@type` which isn't `Article` will convert it to an array `TechArticle` -> `['Article', 'TechArticle']`

```ts
defineArticle({
  // will be resolved as ['Article', 'TechArticle']
  '@type': 'TechArticle',
})
```


## Examples

See the [blog](/guide/recipes/blog) recipe for more examples.

### Minimal

```ts
defineArticle({
  headline: 'Article Title',
  image: '/articles/article-title-image.jpg',
  // using identity as the author
})
```

### Route Meta

Add type support for using the routes meta.

```ts
defineArticle()
```

### Complete

```ts
defineArticle({
  headline: 'Article Title',
  description: 'Article description',
  image: '/articles/article-title-image.jpg',
  datePublished: new Date(2020, 19, 1),
  dateModified: new Date(2020, 19, 1),
  // attaching an author when the identity is an organization
  author: {
    name: 'Harlan Wilton',
    url: 'https://harlanzw.com',
  }
})
```

## Types

```ts
type ValidArticleSubTypes = 'Article' | 'AdvertiserContentArticle' | 'NewsArticle' | 'Report' | 'SatiricalArticle' | 'ScholarlyArticle' | 'SocialMediaPosting' | 'TechArticle'

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
   * - Must be at least 696 pixels wide.
   * - Must be of the following formats+file extensions: .jpg, .png, .gif ,or .webp.
   *
   * Must have markup of it somewhere on the page.
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
}
```
