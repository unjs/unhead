---
title: Music Recording Schema
description: Use defineMusicRecording() to describe a song or track, including its artist, album, duration, ISRC, audio, and release date.
---

## Schema.org MusicRecording

**Type**: `defineMusicRecording<T extends Record<string, any>>(input?: MusicRecording & T)`{lang="ts"}

  Describes an individual music track or song.

## Useful Links

- [MusicRecording - Schema.org](https://schema.org/MusicRecording)

## Required properties

- **name** `string`

  The name of the song/track.

## Recommended properties

- **url** `string`

  The URL where the song can be accessed.

- **byArtist** `NodeRelations<Person | string>`

  The artist or artists who performed the song. Plain objects and strings resolve as [Person](/docs/schema-org/api/schema/person).

- **inAlbum** `NodeRelation<string>`

  The name, URL, or ID of the album. This field is currently passed through without a MusicAlbum resolver.

- **duration** `string`

  The duration of the track in ISO 8601 format (e.g., "PT3M45S" for 3 minutes 45 seconds).

- **isrcCode** `string`

  International Standard Recording Code for the track.

## Defaults

- **@type**: `MusicRecording`
- **@id**: `${canonicalHost}#/schema/music-recording/{n}`

## Examples

### Minimal

```ts
defineMusicRecording({
  name: 'Bohemian Rhapsody',
  url: 'https://example.com/tracks/bohemian-rhapsody',
  byArtist: 'Queen',
})
```

### Detailed example

```ts
defineMusicRecording({
  name: 'Bohemian Rhapsody',
  url: 'https://example.com/tracks/bohemian-rhapsody',
  audio: 'https://example.com/audio/bohemian-rhapsody.mp3',
  byArtist: {
    name: 'Queen',
  },
  inAlbum: 'https://example.com/albums/a-night-at-the-opera',
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
  byArtist?: NodeRelations<Person | string>
  inAlbum?: NodeRelation<string>
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

- [MusicAlbum](/docs/schema-org/api/schema/music-album): Album containing track
- [MusicGroup](/docs/schema-org/api/schema/music-group): Performing artist
- [Person](/docs/schema-org/api/schema/person): Individual artist
