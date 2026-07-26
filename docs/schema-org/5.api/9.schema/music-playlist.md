---
title: Music Playlist Schema
description: Use defineMusicPlaylist() to describe a playlist, including its track count, creator, dates, ratings, artwork, and song list.
---

## Schema.org MusicPlaylist

**Type**: `defineMusicPlaylist<T extends Record<string, any>>(input?: MusicPlaylist & T)`{lang="ts"}

  Describes a curated music playlist.

## Useful Links

- [MusicPlaylist - Schema.org](https://schema.org/MusicPlaylist)

## Required properties

- **name** `string`

  The name of the playlist.

## Recommended Properties

- **track** `NodeRelations<string>`

  Names or URLs of music recordings in the playlist. This field is currently passed through without a MusicRecording resolver.

- **creator** `NodeRelation<Person | string>`

  The person who created the playlist. Plain objects and strings resolve as [Person](/docs/schema-org/api/schema/person).

- **numTracks** `number`

  The number of tracks in the playlist.

## Defaults

- **@type**: `MusicPlaylist`
- **@id**: `${canonicalHost}#/schema/music-playlist/{n}`

## Examples

### Minimal

```ts
defineMusicPlaylist({
  name: 'Best of Rock 2024',
  numTracks: 25,
})
```

### Detailed example

```ts
defineMusicPlaylist({
  name: 'Best of Rock 2024',
  description: 'A curated collection of the best rock songs from 2024',
  url: 'https://example.com/playlists/best-of-rock-2024',
  creator: {
    name: 'Jane Doe',
  },
  numTracks: 25,
  track: [
    'Song Title 1',
    'Song Title 2',
  ],
  datePublished: new Date(2024, 0, 1),
  dateModified: new Date(2024, 11, 31),
  image: 'https://example.com/playlists/best-of-rock-2024-cover.jpg',
})
```

## Types

```ts
export interface MusicPlaylistSimple extends Thing {
  name: string
  description?: string
  url?: string
  numTracks?: number
  track?: NodeRelations<string>
  creator?: NodeRelation<Person | string>
  datePublished?: ResolvableDate
  dateModified?: ResolvableDate
  image?: NodeRelations<string | ImageObject>
  aggregateRating?: NodeRelation<AggregateRating>
}
```

## Related Schemas

- [MusicRecording](/docs/schema-org/api/schema/music-recording): Playlist tracks
- [Person](/docs/schema-org/api/schema/person): Playlist creator
