---
title: Podcast Series Schema
description: Use definePodcastSeries() to describe a podcast show, including its host, RSS feed, episodes, seasons, dates, and cover image.
---

## Schema.org PodcastSeries

**Type**: `definePodcastSeries<T extends Record<string, any>>(input?: PodcastSeries & T)`{lang="ts"}

  Describes a podcast series, the main podcast show.

## Useful Links

- [PodcastSeries - Schema.org](https://schema.org/PodcastSeries)

## Required properties

- **name** `string`

  The name of the podcast series.

## Recommended Properties

- **webFeed** `string`

  The URL of the podcast RSS feed.

- **author** `NodeRelations<Person | Organization | string>`

  The author, creator, or host of the podcast. Plain objects and strings resolve as [Person](/docs/schema-org/api/schema/person); wrap an organization with `defineOrganization()` to select the Organization resolver.

- **image** `NodeRelations<string | ImageObject>`

  The podcast cover art.

- **description** `string`

  A description of the podcast.

- **genre** `string | string[]`

  The genre(s) of the podcast (e.g., "Technology", "Education", "Comedy").

## Defaults

- **@type**: `PodcastSeries`
- **@id**: `${canonicalUrl}#/schema/podcast-series/{n}`

## Examples

### Minimal

```ts
definePodcastSeries({
  name: 'The Example Podcast',
  webFeed: 'https://example.com/podcast/feed.rss',
})
```

### Detailed example

```ts
definePodcastSeries({
  name: 'The Example Podcast',
  description: 'A podcast about interesting topics in technology and science',
  url: 'https://example.com/podcast',
  webFeed: 'https://example.com/podcast/feed.rss',
  image: 'https://example.com/podcast-cover.jpg',
  author: {
    name: 'Jane Doe',
    url: 'https://janedoe.com',
  },
  numberOfEpisodes: 42,
  numberOfSeasons: 3,
  genre: ['Technology', 'Science', 'Education'],
  datePublished: new Date(2023, 0, 1),
})
```

## Types

```ts
export interface PodcastSeriesSimple extends Thing {
  name: string
  description?: string
  image?: NodeRelations<string | ImageObject>
  url?: string
  author?: NodeRelations<Person | Organization | string>
  webFeed?: string
  episode?: NodeRelations<any>
  containsSeason?: NodeRelations<any>
  numberOfEpisodes?: number
  numberOfSeasons?: number
  genre?: string | string[]
  datePublished?: ResolvableDate
  startDate?: ResolvableDate
  endDate?: ResolvableDate
  aggregateRating?: NodeRelation<AggregateRating>
  inLanguage?: string
  keywords?: Arrayable<string>
}
```

## Related Schemas

- [PodcastEpisode](/docs/schema-org/api/schema/podcast-episode): Episodes
- [Person](/docs/schema-org/api/schema/person): Host
- [Organization](/docs/schema-org/api/schema/organization): Publisher
