---
title: EmployerAggregateRating Schema
description: Add Google employer rating structured data with defineEmployerAggregateRating(), including the reviewed organization and aggregate score.
---

## Schema.org EmployerAggregateRating

- **Type**: `defineEmployerAggregateRating(input?: EmployerAggregateRating)`{lang="ts"}

  Describes user ratings for a hiring organization.

## Useful Links

- [Employer rating markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/employer-rating)
- [EmployerAggregateRating - Schema.org](https://schema.org/EmployerAggregateRating)

## Example

```ts
defineEmployerAggregateRating({
  itemReviewed: {
    name: 'World’s Best Coffee Shop',
    sameAs: 'https://coffee.example.com',
  },
  ratingCount: 25,
  ratingValue: 4.4,
})
```

Google requires `itemReviewed`, `ratingValue`, and at least one of `ratingCount` or `reviewCount`. The TypeScript input models that count requirement as a union.

## Defaults and resolves

- `@type` defaults to `EmployerAggregateRating`.
- `@id` defaults to `${canonicalUrl}#employer-aggregate-rating`.
- `itemReviewed` resolves to a root Organization node.
