## Schema.org MusicRecording

**Type**: `defineMusicRecording(input?: MusicRecording)`{lang="ts"}

  Describes an individual music track or song.

## Useful Links

- [MusicRecording - Schema.org](https://schema.org/MusicRecording)

## Required properties

- **name** `string`

  The name of the song/track.

- **url** `string`

  The URL where the song can be accessed.

## Recommended Properties

- **byArtist** `NodeRelations<Person | MusicGroup | string>`

  The artist(s) who performed the song. Resolves to [Person](/docs/schema-org/api/schema/person) or [MusicGroup](/docs/schema-org/api/schema/music-group).

- **inAlbum** `NodeRelation<MusicAlbum>`

  Reference to the album this recording is part of.

- **duration** `string`

  The duration of the track in ISO 8601 format (e.g., "PT3M45S" for 3 minutes 45 seconds).

- **isrcCode** `string`

  International Standard Recording Code for the track.

## Defaults

- **@type**: `MusicRecording`
- **@id**: `${canonicalHost}#music-recording`

## Examples

### Minimal

```ts
defineMusicRecording({
  name: 'Bohemian Rhapsody',
  url: 'https://example.com/tracks/bohemian-rhapsody',
  byArtist: 'Queen',
})
```

### Complete

```ts
defineMusicRecording({
  name: 'Bohemian Rhapsody',
  url: 'https://example.com/tracks/bohemian-rhapsody',
  audio: 'https://example.com/audio/bohemian-rhapsody.mp3',
  byArtist: {
    name: 'Queen',
  },
  inAlbum: {
    name: 'A Night at the Opera',
  },
  duration: 'PT5M55S', // 5 minutes 55 seconds
  isrcCode: 'GBUM71029604',
  datePublished: new Date(1975, 9, 31),
  genre: 'Progressive Rock',
  image: 'https://example.com/tracks/bohemian-rhapsody-cover.jpg',
})
```

## Types

```ts
export interface MusicRecordingSimple extends Thing {
  name: string
  description?: string
  url?: string
  audio?: string
  byArtist?: NodeRelations<Person | MusicGroup | string>
  inAlbum?: NodeRelation<MusicAlbum>
  inPlaylist?: NodeRelations<string>
  duration?: string
  isrcCode?: string
  recordingOf?: NodeRelation<string>
  datePublished?: ResolvableDate
  genre?: string | string[]
  image?: NodeRelations<string | ImageObject>
  aggregateRating?: NodeRelation<AggregateRating>
}
```

## Related Schemas

- [MusicAlbum](/docs/schema-org/api/schema/music-album) - Album containing track
- [MusicGroup](/docs/schema-org/api/schema/music-group) - Performing artist
- [Person](/docs/schema-org/api/schema/person) - Individual artist
