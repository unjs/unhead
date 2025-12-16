## Schema.org MusicAlbum

**Type**: `defineMusicAlbum(input?: MusicAlbum)`{lang="ts"}

  Describes a music album collection.

## Useful Links

- [MusicAlbum - Schema.org](https://schema.org/MusicAlbum)

## Required properties

- **name** `string`

  The name of the album.

## Recommended Properties

- **byArtist** `NodeRelations<Person | MusicGroup | string>`

  The artist(s) of the album. Resolves to [Person](/schema-org/api/schema/person) or [MusicGroup](/schema-org/api/schema/music-group).

- **albumProductionType** `string`

  The production type: "StudioAlbum", "LiveAlbum", "CompilationAlbum", "SoundtrackAlbum", etc.

- **albumReleaseType** `string`

  The release type: "AlbumRelease", "SingleRelease", "EPRelease", etc.

- **track** `NodeRelations<MusicRecording>`

  Array of music recordings on the album.

## Defaults

- **@type**: `MusicAlbum`
- **@id**: `${canonicalHost}#music-album`

## Examples

### Minimal

```ts
defineMusicAlbum({
  name: 'Abbey Road',
  byArtist: 'The Beatles',
})
```

### Complete

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
    { name: 'Come Together' },
    { name: 'Something' },
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
  byArtist?: NodeRelations<Person | MusicGroup | string>
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
