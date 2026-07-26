---
title: Podcast Season Schema
description: Use definePodcastSeason() to add PodcastSeason structured data. Organize podcast episodes by season with episode counts and dates.
---

## Schema.org PodcastSeason

**Type**: `definePodcastSeason<T extends Record<string, any>>(input?: PodcastSeason & T)`{lang="ts"}

  Describes a season of a podcast series.

## Useful Links

- [PodcastSeason - Schema.org](https://schema.org/PodcastSeason)

## Recommended Properties

- **name** `string`

  The name of the season.

- **seasonNumber** `number`

  The season number.

- **partOfSeries** `NodeRelation<any>`

  Reference to the podcast series this season belongs to. Use `definePodcastSeries()` for a nested object if you want Unhead to attach the `PodcastSeries` resolver.

- **numberOfEpisodes** `number`

  The number of episodes in the season.

## Defaults

- **@type**: `PodcastSeason`
- **@id**: `${canonicalUrl}#/schema/podcast-season/{n}`

## Examples

### Minimal

```ts
definePodcastSeason({
  seasonNumber: 2,
  partOfSeries: definePodcastSeries({
    name: 'The Example Podcast',
  }),
})
```

### Detailed example

```ts
definePodcastSeason({
  name: 'Season 2: Advanced Topics',
  seasonNumber: 2,
  description: 'In season 2, we dive deeper into advanced concepts',
  numberOfEpisodes: 12,
  partOfSeries: definePodcastSeries({
    name: 'The Example Podcast',
  }),
  image: 'https://example.com/season-2-cover.jpg',
  datePublished: new Date(2024, 0, 1),
  startDate: new Date(2024, 0, 1),
  endDate: new Date(2024, 5, 30),
})
```

## Types

```ts
export interface PodcastSeasonSimple extends Thing {
  name?: string
  description?: string
  seasonNumber?: number
  numberOfEpisodes?: number
  partOfSeries?: NodeRelation<any>
  episode?: NodeRelations<any>
  datePublished?: ResolvableDate
  startDate?: ResolvableDate
  endDate?: ResolvableDate
  image?: NodeRelations<string | ImageObject>
  url?: string
  actor?: NodeRelations<Person | string>
  director?: NodeRelations<Person | string>
  productionCompany?: NodeRelation<Organization | string>
  aggregateRating?: NodeRelation<AggregateRating>
}
```
