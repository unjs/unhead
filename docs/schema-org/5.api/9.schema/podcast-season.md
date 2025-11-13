## Schema.org PodcastSeason

**Type**: `definePodcastSeason(input?: PodcastSeason)`{lang="ts"}

  Describes a season of a podcast series.

## Useful Links

- [PodcastSeason - Schema.org](https://schema.org/PodcastSeason)
- [Podcast Structured Data - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/podcast)

## Recommended Properties

- **name** `string`

  The name of the season.

- **seasonNumber** `number`

  The season number.

- **partOfSeries** `NodeRelation<any>`

  Reference to the podcast series this season belongs to.

- **numberOfEpisodes** `number`

  The number of episodes in the season.

## Defaults

- **@type**: `PodcastSeason`

## Examples

### Minimal

```ts
definePodcastSeason({
  seasonNumber: 2,
  partOfSeries: {
    name: 'The Example Podcast',
  },
})
```

### Complete

```ts
definePodcastSeason({
  name: 'Season 2: Advanced Topics',
  seasonNumber: 2,
  description: 'In season 2, we dive deeper into advanced concepts',
  numberOfEpisodes: 12,
  partOfSeries: {
    name: 'The Example Podcast',
  },
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
}
```
