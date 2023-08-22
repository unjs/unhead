## Schema.org Comment

- **Type**: `defineComment(input?: Comment)`{lang="ts"}

  Describes a review. Usually in the context of an Article or a WebPage.

- **Component**: `SchemaOrgComment` _(see [how components work](/guide/guides/components))_


## Useful Links

- [Comment - Schema.org](https://schema.org/Comment)
- [Comment - Yoast](https://developer.yoast.com/features/schema/pieces/comment)
- [Recipe: Blog](/guide/recipes/blog)

## Required properties

- **text** `string`

  Content of the comment

## Recommended Properties


- **author** `Person`

  The registered author is moved to a root Schema node, resolving the field as reference to a [Person](/schema/person).


## Defaults

- **@type**: `Comment`
- **@id**: `${canonicalUrl}#/schema/comment/${hash(node)}`
- **about**: Article reference

## Resolves

- `author` will be resolved as root nodes and referenced

## Examples

See the [blog](/guide/recipes/blog) recipe for more examples.

### Minimal

```ts
defineComment({
  text: 'This is really cool!',
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
  author: NodeRelation<Person>
}
```
