## Schema.org MusicPlaylist

**Type**: `defineMusicPlaylist(input?: MusicPlaylist)`{lang="ts"}

  Describes a curated music playlist.

## Useful Links

- [MusicPlaylist - Schema.org](https://schema.org/MusicPlaylist)

## Required properties

- **name** `string`

  The name of the playlist.

## Recommended Properties

- **track** `NodeRelations<MusicRecording>`

  Array of music recordings in the playlist.

- **creator** `NodeRelations<Person | MusicGroup | string>`

  The person or group who created the playlist. Resolves to [Person](/docs/schema-org/api/schema/person) or [MusicGroup](/docs/schema-org/api/schema/music-group).

- **numTracks** `number`

  The number of tracks in the playlist.

## Defaults

- **@type**: `MusicPlaylist`
- **@id**: `${canonicalHost}#music-playlist`

## Examples

### Minimal

```ts
defineMusicPlaylist({
  name: 'Best of Rock 2024',
  numTracks: 25,
})
```

### Complete

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
    { name: 'Song Title 1', byArtist: 'Artist 1' },
    { name: 'Song Title 2', byArtist: 'Artist 2' },
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

- [MusicRecording](/docs/schema-org/api/schema/music-recording) - Playlist tracks
- [Person](/docs/schema-org/api/schema/person) - Playlist creator
