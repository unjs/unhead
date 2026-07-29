---
title: VacationRental Schema
description: Add Google vacation rental structured data with defineVacationRental(), including accommodation, location, amenities, beds, ratings, and reviews.
---

## Schema.org VacationRental

- **Type**: `defineVacationRental(input?: VacationRental)`{lang="ts"}

  Describes a vacation property listing.

## Useful Links

- [Vacation rental markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/vacation-rental)
- [VacationRental - Schema.org](https://schema.org/VacationRental)

## Example

```ts
defineVacationRental({
  name: 'Beach House',
  identifier: 'beach-house-1',
  image: [
    '/images/beach-house-1.jpg',
    '/images/beach-house-2.jpg',
  ],
  latitude: -38.14992,
  longitude: 144.36172,
  containsPlace: {
    occupancy: {
      value: 5,
    },
    additionalType: 'EntirePlace',
    amenityFeature: {
      name: 'wifi',
      value: true,
    },
    bed: {
      numberOfBeds: 1,
      typeOfBed: 'Queen',
    },
  },
})
```

Google requires `containsPlace`, `containsPlace.occupancy`, `identifier`, `image`, `name`, and a location. Supply the location with either `latitude` and `longitude` or a `geo` object. Google's eligibility policy requires at least eight listing photos even though the TypeScript type only enforces that `image` is present.

## Defaults and resolves

- `@type` defaults to `VacationRental`.
- `@id` defaults to `${canonicalUrl}#vacation-rental`.
- Relative image URLs resolve against the configured host.
- Accommodation, address, brand, coordinates, ratings, and reviews receive their Schema.org types.
- Review dates serialize to ISO 8601.
- A root rental references the primary WebPage through `mainEntityOfPage`.
