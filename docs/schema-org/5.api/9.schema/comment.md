---
title: Comment Schema
description: Use defineComment() to add Comment structured data. Connect user comments to articles and blog posts with author and date information.
---

## Schema.org Comment

- **Type**: `defineComment<T extends Record<string, any>>(input?: Comment & T)`{lang="ts"}

  Describes a comment, usually in the context of an Article or WebPage.

## Useful Links

- [Comment - Schema.org](https://schema.org/Comment)
- [Recipe: Blog](/docs/schema-org/guides/recipes/blog)

## Required properties

- **text** `string`

  Content of the comment.

- **author** `Person | Organization`

  Unhead moves the registered author to a root Schema node. The field resolves to an `@id` reference to a [Person](/docs/schema-org/api/schema/person) or an [Organization](/docs/schema-org/api/schema/organization). An author without `@type` resolves as a Person.

## Defaults

- **@type**: `Comment`
- **@id**: `${canonicalUrl}#/schema/comment/{n}`
- **about**: Article reference

## Resolves

- `author` is resolved as a root Person or Organization node and replaced with an ID reference
- `dateCreated`, `dateModified`, and `datePublished` accept Date objects and are serialized as ISO 8601 strings

## Examples

See the [blog](/docs/schema-org/guides/recipes/blog) recipe for more examples.

### Minimal

```ts
defineComment({
  text: 'The setup guide answered my question.',
  author: {
    name: 'Harlan Wilton',
    url: 'https://harlanzw.com',
  }
})
```

## Types

```ts
export interface CommentSimple extends Thing {
  /**
   * The textual content of the comment, stripping HTML tags.
   */
  text: string
  /**
   *  A reference by ID to the parent Article (or WebPage, when no Article is present).
   */
  about?: IdReference
  /**
   * A reference by ID to the Person who wrote the comment.
   */
  author: NodeRelation<Identity>
  /**
   * The date and time the comment was created.
   */
  dateCreated?: ResolvableDate
  /**
   * The date and time the comment was last modified.
   */
  dateModified?: ResolvableDate
  /**
   * The date and time the comment was published.
   */
  datePublished?: ResolvableDate
  /**
   * Replies to this comment.
   */
  comment?: NodeRelations<Comment>
  /**
   * The number of replies.
   */
  commentCount?: number
  /**
   * The source type when content was generated or edited algorithmically.
   */
  digitalSourceType?: DigitalSourceType
  /**
   * Images attached to the comment.
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * Videos attached to the comment.
   */
  video?: NodeRelations<VideoObject | string>
  /**
   * The number of upvotes the comment has received.
   */
  upvoteCount?: number
  /**
   * The number of downvotes the comment has received.
   */
  downvoteCount?: number
}
```

## Related Schemas

- [Person](/docs/schema-org/api/schema/person): Comment author
- [Article](/docs/schema-org/api/schema/article): Commented content
