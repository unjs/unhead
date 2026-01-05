## Schema.org Movie

**Type**: `defineMovie(input?: Movie)`{lang="ts"}

  Describes a movie.

## Useful Links

- [Movie - Schema.org](https://schema.org/Movie)
- [Movie Markup - Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/movie)

### Example

```ts
defineMovie({
  name: 'Black Panther',
  url: '/2019-best-picture-noms#black-panther',
  image: '/photos/6x9/photo.jpg',
  dateCreated: '2018-02-16',
  director: 'Ryan Coogle',
  review: {
    reviewRating: 2,
    author: 'Trevor R',
    reviewBody: 'I didn\'t like the lighting and CGI in this movie.',
  },
  aggregateRating: {
    ratingValue: 96,
    bestRating: 100,
    ratingCount: 88211,
  },
})
```

## Types

```ts
export interface MovieSimple extends Thing {
  /**
   * An image that represents the movie.
   */
  image: NodeRelations<string | ImageObject>
  /**
   * The name of the movie.
   */
  name: string
  /**
   * Annotation for the average review score assigned to the movie.
   */
  aggregateRating?: NodeRelation<AggregateRating>
  /**
   * The date the movie was released.
   */
  dateCreated?: ResolvableDate
  /**
   * The director of the movie.
   */
  director?: NodeRelations<Person | string>
  /**
   * The actor of the movie.
   */
  actor?: NodeRelations<Person | string>
  /**
   * A nested Review of the movie.
   */
  review?: NodeRelations<Review>
  /**
   * The trailer of a movie or TV/radio series, season, episode, etc.
   */
  trailer?: NodeRelations<string | VideoObject>
  /**
   * The duration of the movie.
   */
  duration?: string
  /**
   * The genre of the movie.
   */
  genre?: string
  /**
   * The content rating of the movie.
   */
  contentRating?: string
  /**
   * The production company of the movie.
   */
  productionCompany?: NodeRelation<Organization>
}
```

## Related Schemas

- [Person](/docs/schema-org/api/schema/person) - Director, actors
- [Organization](/docs/schema-org/api/schema/organization) - Production company
- [MusicRecording](/docs/schema-org/api/schema/music-recording) - Soundtrack
