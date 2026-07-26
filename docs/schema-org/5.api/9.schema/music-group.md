---
title: Music Group Schema
description: Use defineMusicGroup() to describe a band or musical group, including its members, genre, dates, discography, and profiles.
---

## Schema.org MusicGroup

**Type**: `defineMusicGroup<T extends Record<string, any>>(input?: MusicGroup & T)`{lang="ts"}

  Describes a band or musical group.

## Useful Links

- [MusicGroup - Schema.org](https://schema.org/MusicGroup)

## Required properties

- **name** `string`

  The name of the band/musical group.

## Recommended Properties

- **member** `NodeRelations<Person | string>`

  An array of band members, resolved as [Person](/docs/schema-org/api/schema/person) nodes.

- **genre** `string | string[]`

  The genre(s) of music the group performs.

- **album** `NodeRelations<string>`

  Names or URLs of albums by the group. This field is currently passed through without a MusicAlbum resolver.

## Defaults

- **@type**: `MusicGroup`
- **@id**: `${canonicalHost}#/schema/music-group/{n}`
- **url**: `canonicalHost`

## Examples

### Minimal

```ts
defineMusicGroup({
  name: 'The Beatles',
})
```

### Detailed example

```ts
defineMusicGroup({
  name: 'The Beatles',
  description: 'English rock band formed in Liverpool in 1960',
  url: 'https://example.com/artists/the-beatles',
  genre: ['Rock', 'Pop'],
  member: [
    { name: 'John Lennon' },
    { name: 'Paul McCartney' },
    { name: 'George Harrison' },
    { name: 'Ringo Starr' },
  ],
  foundingDate: new Date(1960, 7, 1),
  dissolutionDate: new Date(1970, 3, 10),
  album: [
    'Abbey Road',
    'Sgt. Pepper\'s Lonely Hearts Club Band',
  ],
  image: 'https://example.com/artists/the-beatles.jpg',
  sameAs: [
    'https://www.facebook.com/thebeatles',
    'https://twitter.com/thebeatles',
  ],
})
```

## Types

```ts
export interface MusicGroupSimple extends Thing {
  name: string
  description?: string
  url?: string
  genre?: string | string[]
  member?: NodeRelations<Person | string>
  foundingDate?: ResolvableDate
  dissolutionDate?: ResolvableDate
  album?: NodeRelations<string>
  track?: NodeRelations<string>
  image?: NodeRelations<string | ImageObject>
  sameAs?: Arrayable<string>
}
```

## Related Schemas

- [Person](/docs/schema-org/api/schema/person): Band members
- [MusicAlbum](/docs/schema-org/api/schema/music-album): Discography
- [MusicRecording](/docs/schema-org/api/schema/music-recording): Songs
- [Event](/docs/schema-org/api/schema/event): Concerts
