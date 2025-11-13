## Schema.org Service

**Type**: `defineService(input?: Service)`{lang="ts"}

  Describes a service offering (distinct from physical products).

## Useful Links

- [Service - Schema.org](https://schema.org/Service)

## Required properties

- **name** `string`

  The name of the service.

## Recommended Properties

- **serviceType** `string`

  The type of service (e.g., "web design", "plumbing", "consulting", "legal advice").

- **provider** `NodeRelations<Person | Organization | string>`

  Who provides the service. Resolves to [Person](/schema-org/api/schema/person) or [Organization](/schema-org/api/schema/organization).

- **areaServed** `string`

  Geographic area where the service is provided (e.g., "United States", "San Francisco", "Global").

- **offers** `NodeRelations<Offer | AggregateOffer>`

  Pricing information for the service. Resolves to [Offer](/schema-org/api/schema/offer).

## Defaults

- **@type**: `Service`
- **@id**: `${canonicalUrl}#service`
- **description**: `currentRouteMeta.description` _(see: [Schema.org Params](/schema-org/getting-started/params))_
- **image**: `currentRouteMeta.image` _(see: [Schema.org Params](/schema-org/getting-started/params))_

## Sub-Types

- `BroadcastService`
- `CableOrSatelliteService`
- `FinancialService`
- `FoodService`
- `GovernmentService`
- `TaxiService`
- `Telecom`

You can specify a subtype using the `@type` property.

## Examples

### Minimal

```ts
defineService({
  name: 'Web Design Services',
  serviceType: 'Web Design',
})
```

### With Pricing

```ts
defineService({
  name: 'Professional Web Design',
  serviceType: 'Web Design',
  description: 'Custom website design and development services',
  provider: {
    name: 'Design Studio Inc.',
  },
  areaServed: 'United States',
  offers: {
    price: 5000,
    priceCurrency: 'USD',
    description: 'Starting price for basic website',
  },
})
```

### Complete

```ts
defineService({
  name: 'Professional Consulting Services',
  '@type': 'FinancialService',
  serviceType: 'Financial Consulting',
  description: 'Expert financial advisory and consulting for businesses',
  url: 'https://example.com/services/consulting',
  provider: {
    name: 'Expert Consultants LLC',
    url: 'https://example.com',
  },
  areaServed: ['United States', 'Canada', 'United Kingdom'],
  category: 'Consulting',
  image: 'https://example.com/services/consulting-hero.jpg',
  offers: {
    price: 250,
    priceCurrency: 'USD',
    description: 'Hourly consulting rate',
  },
  aggregateRating: {
    ratingValue: 4.8,
    ratingCount: 120,
  },
  review: [
    {
      author: 'Jane Smith',
      reviewRating: 5,
      reviewBody: 'Excellent service, highly recommended!',
    },
  ],
  termsOfService: 'https://example.com/terms',
  slogan: 'Your success is our mission',
})
```

## Types

```ts
export interface ServiceChannel extends Thing {
  serviceUrl?: string
  servicePhone?: string
  serviceLocation?: string
  availableLanguage?: string[]
}

type ValidServiceSubTypes = 'Service' | 'BroadcastService' | 'CableOrSatelliteService' | 'FinancialService' | 'FoodService' | 'GovernmentService' | 'TaxiService' | 'Telecom'

export interface ServiceSimple extends Thing {
  '@type'?: Arrayable<ValidServiceSubTypes>
  name: string
  description?: string
  serviceType?: string
  provider?: NodeRelations<Identity>
  areaServed?: string | string[]
  availableChannel?: NodeRelations<ServiceChannel>
  audience?: string
  category?: string | string[]
  hasOfferCatalog?: string
  offers?: NodeRelations<Offer | AggregateOffer>
  aggregateRating?: NodeRelation<AggregateRating>
  review?: NodeRelations<Review>
  image?: NodeRelations<string | ImageObject>
  logo?: NodeRelations<string | ImageObject>
  url?: string
  termsOfService?: string
  slogan?: string
  brand?: NodeRelations<Brand>
}
```
