---
title: Music Group Schema
description: Use defineMusicGroup() to add MusicGroup structured data. Display band info with members, genre, and discography in search results.
---

## Schema.org MusicGroup

**Type**: `defineMusicGroup(input?: MusicGroup)`{lang="ts"}

  Describes a band or musical group.

## Useful Links

- [MusicGroup - Schema.org](https://schema.org/MusicGroup)

## Required properties

- **name** `string`

  The name of the band/musical group.

## Recommended Properties

- **member** `NodeRelations<Person | string>`

  Array of band members. Resolves to [Person](/docs/schema-org/api/schema/person).

- **genre** `string | string[]`

  The genre(s) of music the group performs.

- **album** `NodeRelations<MusicAlbum>`

  Array of albums by the group.

## Defaults

- **@type**: `MusicGroup`
- **@id**: `${canonicalHost}#music-group`
- **url**: `options.canonicalHost`

## Examples

### Minimal

```ts
defineMusicGroup({
  name: 'The Beatles',
})
```

### Complete

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
    { name: 'Abbey Road' },
    { name: 'Sgt. Pepper\'s Lonely Hearts Club Band' },
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

- [Person](/docs/schema-org/api/schema/person) - Band members
- [MusicAlbum](/docs/schema-org/api/schema/music-album) - Discography
- [MusicRecording](/docs/schema-org/api/schema/music-recording) - Songs
- [Event](/docs/schema-org/api/schema/event) - Concerts
