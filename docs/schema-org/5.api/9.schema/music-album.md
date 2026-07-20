---
title: Music Album Schema
description: Use defineMusicAlbum() to describe an album, including its artist, tracks, release date, genre, ratings, and artwork.
---

## Schema.org MusicAlbum

**Type**: `defineMusicAlbum<T extends Record<string, any>>(input?: MusicAlbum & T)`{lang="ts"}

  Describes a music album collection.

## Useful Links

- [MusicAlbum - Schema.org](https://schema.org/MusicAlbum)

## Required properties

- **name** `string`

  The name of the album.

## Recommended Properties

- **byArtist** `NodeRelations<Person | string>`

  The artist or artists on the album. Plain nested objects are resolved as [Person](/docs/schema-org/api/schema/person) nodes. Use a nested `defineMusicGroup()` value when the artist is a group.

- **albumProductionType** `string`

  The production type: "StudioAlbum", "LiveAlbum", "CompilationAlbum", "SoundtrackAlbum", etc.

- **albumReleaseType** `string`

  The release type: "AlbumRelease", "SingleRelease", "EPRelease", etc.

- **track** `NodeRelations<string>`

  Names or URLs of music recordings on the album. This field is currently passed through without a MusicRecording resolver.

## Defaults

- **@type**: `MusicAlbum`
- **@id**: `${canonicalHost}#/schema/music-album/{n}`

## Examples

### Minimal

```ts
defineMusicAlbum({
  name: 'Abbey Road',
  byArtist: 'The Beatles',
})
```

### Detailed example

```ts
defineMusicAlbum({
  name: 'Abbey Road',
  description: 'The eleventh studio album by The Beatles',
  url: 'https://example.com/albums/abbey-road',
  byArtist: {
    name: 'The Beatles',
  },
  albumProductionType: 'StudioAlbum',
  albumReleaseType: 'AlbumRelease',
  datePublished: new Date(1969, 8, 26),
  genre: ['Rock', 'Pop'],
  numTracks: 17,
  image: 'https://example.com/albums/abbey-road-cover.jpg',
  track: [
    'Come Together',
    'Something',
    // ... more tracks
  ],
})
```

## Types

```ts
export interface MusicAlbumSimple extends Thing {
  name: string
  description?: string
  url?: string
  byArtist?: NodeRelations<Person | string>
  track?: NodeRelations<string>
  albumProductionType?: string
  albumReleaseType?: string
  datePublished?: ResolvableDate
  genre?: string | string[]
  numTracks?: number
  image?: NodeRelations<string | ImageObject>
  aggregateRating?: NodeRelation<AggregateRating>
  review?: NodeRelations<Review>
}
```

## Related Schemas

- [MusicGroup](/docs/schema-org/api/schema/music-group): Artist/band
- [MusicRecording](/docs/schema-org/api/schema/music-recording): Album tracks
- [Person](/docs/schema-org/api/schema/person): Artist
