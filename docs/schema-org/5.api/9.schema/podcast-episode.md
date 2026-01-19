---
title: Podcast Episode Schema
description: Use definePodcastEpisode() to add PodcastEpisode structured data. Enable podcast rich results with episode title, audio, and description.
---

## Schema.org PodcastEpisode

**Type**: `definePodcastEpisode(input?: PodcastEpisode)`{lang="ts"}

  Describes an individual podcast episode.

## Useful Links

- [PodcastEpisode - Schema.org](https://schema.org/PodcastEpisode)
- [Podcast Structured Data - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/podcast)

## Required properties

- **name** `string`

  The name/title of the podcast episode.

- **url** `string`

  The URL of the episode page.

## Recommended Properties

- **audio** `string`

  The URL of the audio file for the episode.

- **description** `string`

  A description of the episode.

- **duration** `string`

  The duration of the episode in ISO 8601 format (e.g., "PT45M" for 45 minutes).

- **datePublished** `ResolvableDate`

  The date the episode was published.

- **partOfSeries** `NodeRelation<any>`

  Reference to the podcast series this episode belongs to.

## Defaults

- **@type**: `PodcastEpisode`
- **inLanguage**: `options.defaultLanguage` _(see: [Schema.org Params](/docs/schema-org/guides/core-concepts/params))_

## Examples

### Minimal

```ts
definePodcastEpisode({
  name: 'Episode 1: Getting Started',
  url: 'https://example.com/podcast/episode-1',
  audio: 'https://example.com/podcast/ep1.mp3',
})
```

### Complete

```ts
definePodcastEpisode({
  name: 'Episode 42: The Answer to Everything',
  description: 'In this episode, we explore the meaning of life, the universe, and everything.',
  url: 'https://example.com/podcast/episode-42',
  audio: 'https://example.com/podcast/ep42.mp3',
  episodeNumber: 42,
  duration: 'PT45M30S', // 45 minutes 30 seconds
  datePublished: new Date(2024, 5, 15),
  image: 'https://example.com/episode-42-cover.jpg',
  transcript: 'https://example.com/podcast/ep42-transcript',
  partOfSeries: {
    name: 'The Example Podcast',
  },
  author: {
    name: 'Jane Doe',
  },
})
```

## Types

```ts
export interface PodcastEpisodeSimple extends Thing {
  name: string
  description?: string
  url?: string
  episodeNumber?: number | string
  partOfSeries?: NodeRelation<any>
  partOfSeason?: NodeRelation<any>
  author?: NodeRelations<Person | Organization | string>
  audio?: NodeRelation<any | string>
  duration?: string
  image?: NodeRelations<string | ImageObject>
  thumbnailUrl?: string
  datePublished?: ResolvableDate
  uploadDate?: ResolvableDate
  transcript?: string
  inLanguage?: string
  aggregateRating?: NodeRelation<AggregateRating>
  review?: NodeRelations<Review>
  keywords?: Arrayable<string>
}
```

## Related Schemas

- [PodcastSeries](/docs/schema-org/api/schema/podcast-series) - Parent series
- [Person](/docs/schema-org/api/schema/person) - Host, guests
