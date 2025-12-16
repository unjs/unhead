## Schema.org TVEpisode

**Type**: `defineTVEpisode(input?: TVEpisode)`{lang="ts"}

  Describes an individual TV episode.

## Useful Links

- [TVEpisode - Schema.org](https://schema.org/TVEpisode)
- [Video Structured Data - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/video)

## Required properties

- **name** `string`

  The name/title of the episode.

## Recommended Properties

- **episodeNumber** `number`

  The episode number within its season.

- **partOfSeason** `NodeRelation<TVSeason>`

  Reference to the season this episode belongs to.

- **partOfSeries** `NodeRelation<TVSeries>`

  Reference to the series this episode belongs to.

- **video** `NodeRelations<VideoObject | string>`

  Video content for the episode. Resolves to [VideoObject](/schema-org/api/schema/video).

- **duration** `string`

  The duration in ISO 8601 format (e.g., "PT45M" for 45 minutes).

## Defaults

- **@type**: `TVEpisode`

## Examples

### Minimal

```ts
defineTVEpisode({
  name: 'Pilot',
  episodeNumber: 1,
})
```

### Complete

```ts
defineTVEpisode({
  name: 'Pilot',
  description: 'The first episode of Breaking Bad',
  episodeNumber: 1,
  partOfSeason: {
    seasonNumber: 1,
  },
  partOfSeries: {
    name: 'Breaking Bad',
  },
  url: 'https://example.com/shows/breaking-bad/s1/e1',
  duration: 'PT58M',
  datePublished: new Date(2008, 0, 20),
  image: 'https://example.com/shows/breaking-bad-s1e1.jpg',
  video: {
    name: 'Pilot',
    url: 'https://example.com/videos/breaking-bad-s1e1.mp4',
    uploadDate: new Date(2008, 0, 20),
  },
  actor: [
    { name: 'Bryan Cranston' },
    { name: 'Aaron Paul' },
  ],
  director: {
    name: 'Vince Gilligan',
  },
  aggregateRating: {
    ratingValue: 9.0,
    ratingCount: 50000,
  },
})
```

## Types

```ts
export interface TVEpisodeSimple extends Thing {
  name: string
  description?: string
  episodeNumber?: number | string
  partOfSeason?: NodeRelation<any>
  partOfSeries?: NodeRelation<any>
  actor?: NodeRelations<Person | string>
  director?: NodeRelations<Person | string>
  datePublished?: ResolvableDate
  uploadDate?: ResolvableDate
  duration?: string
  video?: NodeRelation<VideoObject | string>
  image?: NodeRelations<string | ImageObject>
  thumbnailUrl?: string
  url?: string
  aggregateRating?: NodeRelation<AggregateRating>
  review?: NodeRelations<Review>
  contentRating?: string
  musicBy?: NodeRelations<Person | string>
}
```
