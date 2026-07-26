---
title: Person Schema
description: Use definePerson() to add Person structured data. Establish author identity for articles and content with name, image, and social profile links.
---

## Schema.org Person

- **Type**: `definePerson<T extends Record<string, any>>(input?: Person & T)`{lang="ts"}

  Describes an individual person. It is most commonly used to identify the author of a piece of content, such as an Article or Comment.

## Useful Links

- [Schema.org Person](https://schema.org/Person)
- [Choose an Identity - Person](/docs/schema-org/guides/recipes/identity#person)

## Required properties

- **name** `string`

  The name of the person.

## Recommended Properties

- **image**  `NodeRelations<ImageObject | string>`

  The URL of the person's avatar image.

- **url** `string` or **sameAs** `Arrayable<string>`

  Links that describe the person, for example their website or social accounts.

## Examples

### Minimal

```ts
definePerson({
  name: 'Harlan Wilton',
  image: '/me.png',
})
```

## Defaults

- **@type**: `Person`
- **@id**: `${canonicalHost}#identity`
- **url**: `canonicalHost`

## Resolves

See [Global Resolves](/docs/schema-org/guides/get-started/overview#how-does-schemaorg-get-page-data) for full context.

- resolves relative string URLs in `image`
- when `@id` is omitted, uses the primary `#identity` ID and links the Person as the WebSite publisher and default Article author when those nodes exist

## Types

```ts
/**
 * A person (alive, dead, undead, or fictional).
 */
export interface PersonSimple extends Thing {
  /**
   * The full name of the Person.
   */
  name: string
  /**
   * The user bio.
   */
  description?: string
  /**
   * An array of URLs representing declared social/authoritative profiles of the person
   * (e.g., a Wikipedia page, or Facebook profile).
   */
  sameAs?: Arrayable<string>
  /**
   * An array of images which represent the person, referenced by ID.
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * The URL of the user's profile page (if they're affiliated with the site in question),
   * or to their personal homepage/website.
   */
  url?: string
}
```

## Related Schemas

- [Organization](/docs/schema-org/api/schema/organization): Person's employer
- [Article](/docs/schema-org/api/schema/article): Articles by person
