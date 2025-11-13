## Schema.org TVSeason

**Type**: `defineTVSeason(input?: TVSeason)`{lang="ts"}

  Describes a season of a TV series.

## Useful Links

- [TVSeason - Schema.org](https://schema.org/TVSeason)

## Recommended Properties

- **name** `string`

  The name of the season.

- **seasonNumber** `number`

  The season number.

- **partOfSeries** `NodeRelation<TVSeries>`

  Reference to the TV series this season belongs to.

- **numberOfEpisodes** `number`

  The number of episodes in the season.

## Defaults

- **@type**: `TVSeason`

## Examples

### Minimal

```ts
defineTVSeason({
  seasonNumber: 2,
  partOfSeries: {
    name: 'Breaking Bad',
  },
})
```

### Complete

```ts
defineTVSeason({
  name: 'Season 2',
  seasonNumber: 2,
  description: 'The second season of Breaking Bad',
  numberOfEpisodes: 13,
  partOfSeries: {
    name: 'Breaking Bad',
  },
  image: 'https://example.com/shows/breaking-bad-season-2.jpg',
  datePublished: new Date(2009, 2, 8),
  startDate: new Date(2009, 2, 8),
  endDate: new Date(2009, 4, 31),
})
```

## Types

```ts
export interface TVSeasonSimple extends Thing {
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
