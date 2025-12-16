## Schema.org TVSeries

**Type**: `defineTVSeries(input?: TVSeries)`{lang="ts"}

  Describes a TV show series.

## Useful Links

- [TVSeries - Schema.org](https://schema.org/TVSeries)
- [Video Structured Data - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/video)

## Required properties

- **name** `string`

  The name of the TV series.

## Recommended Properties

- **actor** `NodeRelations<Person | string>`

  Array of actors in the series. Resolves to [Person](/schema-org/api/schema/person).

- **director** `NodeRelations<Person | string>`

  Array of directors of the series. Resolves to [Person](/schema-org/api/schema/person).

- **creator** `NodeRelations<Person | Organization | string>`

  The creator of the series. Resolves to [Person](/schema-org/api/schema/person) or [Organization](/schema-org/api/schema/organization).

- **numberOfSeasons** `number`

  The total number of seasons.

- **numberOfEpisodes** `number`

  The total number of episodes.

## Defaults

- **@type**: `TVSeries`
- **@id**: `${canonicalHost}#tv-series`

## Examples

### Minimal

```ts
defineTVSeries({
  name: 'Breaking Bad',
})
```

### Complete

```ts
defineTVSeries({
  name: 'Breaking Bad',
  description: 'A chemistry teacher diagnosed with cancer turns to manufacturing meth',
  url: 'https://example.com/shows/breaking-bad',
  image: 'https://example.com/shows/breaking-bad-poster.jpg',
  numberOfSeasons: 5,
  numberOfEpisodes: 62,
  genre: ['Crime', 'Drama', 'Thriller'],
  actor: [
    { name: 'Bryan Cranston' },
    { name: 'Aaron Paul' },
  ],
  director: [
    { name: 'Vince Gilligan' },
  ],
  creator: {
    name: 'Vince Gilligan',
  },
  productionCompany: {
    name: 'AMC Studios',
  },
  datePublished: new Date(2008, 0, 20),
  aggregateRating: {
    ratingValue: 9.5,
    ratingCount: 1500000,
  },
})
```

## Types

```ts
export interface TVSeriesSimple extends Thing {
  name: string
  description?: string
  url?: string
  image?: NodeRelations<string | ImageObject>
  actor?: NodeRelations<Person | string>
  director?: NodeRelations<Person | string>
  creator?: NodeRelations<Person | Organization | string>
  numberOfSeasons?: number
  numberOfEpisodes?: number
  containsSeason?: NodeRelations<any>
  episode?: NodeRelations<any>
  genre?: string | string[]
  datePublished?: ResolvableDate
  startDate?: ResolvableDate
  endDate?: ResolvableDate
  productionCompany?: NodeRelation<Organization | string>
  aggregateRating?: NodeRelation<AggregateRating>
  countryOfOrigin?: string
  trailer?: NodeRelation<VideoObject | string>
  contentRating?: string
}
```
