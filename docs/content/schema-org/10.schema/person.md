## Schema.org Person

- **Type**: `definePerson(input?: Person)`{lang="ts"}

  Describes an individual person. Most commonly used to identify the author of a piece of content (such as an Article or Comment).

- **Component**: `SchemaOrgPerson` _(see [how components work](/guide/guides/components))_


## Useful Links

- [Schema.org Person](https://schema.org/Person)
- [Choose an Identity - Person](/guide/guides/identity#person)


## Required properties

- **name** `string`

  The name of the person.

## Recommended Properties

- **image**  `ImageInput`

  Avatar image url of the person

- **link** `string` or **sameAs** `string[]`

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

See [Global Resolves](/guide/getting-started/how-it-works#global-resolves) for full context.

- resolves relative string urls of `image`
- omitting the `@id` attribute, will automatically set up the person to be the identity of the WebSite and author
  of any content.

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
   * The user bio, truncated to 250 characters.
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
   * The URL of the users' profile page (if they're affiliated with the site in question),
   * or to their personal homepage/website.
   */
  url?: string
}
```
