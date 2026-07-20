---
title: Service Schema
description: Use defineService() to describe a service offering, including pricing, provider, service area, channels, ratings, and reviews.
---

## Schema.org Service

**Type**: `defineService<T extends Record<string, any>>(input?: Service & T)`{lang="ts"}

  Describes a service offering (distinct from physical products).

## Useful Links

- [Service - Schema.org](https://schema.org/Service)

## Required properties

- **name** `string`

  The name of the service.

## Recommended Properties

- **serviceType** `string`

  The type of service (e.g., "web design", "plumbing", "consulting", "legal advice").

- **provider** `NodeRelation<Person | Organization>`

  Who provides the service. If omitted, Unhead references the primary identity. An explicitly supplied provider is passed through, so include its `@type` or use a nested `definePerson()` or `defineOrganization()` helper.

- **areaServed** `string`

  Geographic area where the service is provided (e.g., "United States", "San Francisco", "Global").

- **offers** `NodeRelations<Offer>`

  Unhead resolves the pricing information as an Offer.

## Defaults

- **@type**: `Service`
- **@id**: `${canonicalUrl}#service`
- **name**: page title from resolved metadata
- **description**: resolved page description
- **image**: resolved page image
- **provider**: ID reference to the primary identity, when one exists
- **brand**: ID reference to the primary identity, when one exists
- **mainEntityOfPage**: ID reference to the WebPage, when one exists

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
    '@type': 'Organization',
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

### Detailed example

```ts
defineService({
  'name': 'Professional Consulting Services',
  '@type': 'FinancialService',
  'serviceType': 'Financial Consulting',
  'description': 'Expert financial advisory and consulting for businesses',
  'url': 'https://example.com/services/consulting',
  'provider': {
    '@type': 'Organization',
    name: 'Expert Consultants LLC',
    url: 'https://example.com',
  },
  'areaServed': ['United States', 'Canada', 'United Kingdom'],
  'category': 'Consulting',
  'image': 'https://example.com/services/consulting-hero.jpg',
  'offers': {
    price: 250,
    priceCurrency: 'USD',
    description: 'Hourly consulting rate',
  },
  'aggregateRating': {
    ratingValue: 4.8,
    ratingCount: 120,
  },
  'review': [
    {
      author: 'Jane Smith',
      reviewRating: {
        ratingValue: 5,
      },
      reviewBody: 'Excellent service, highly recommended!',
    },
  ],
  'termsOfService': 'https://example.com/terms',
  'slogan': 'Your success is our mission',
})
```

## Types

```ts
export interface ServiceChannel {
  '@type'?: 'ServiceChannel'
  'serviceUrl'?: string
  'servicePhone'?: string
  'serviceLocation'?: string
  'availableLanguage'?: string | string[]
}

type ValidServiceSubTypes = 'Service' | 'BroadcastService' | 'CableOrSatelliteService' | 'FinancialService' | 'FoodService' | 'GovernmentService' | 'TaxiService' | 'Telecom'

export interface ServiceSimple extends Thing {
  '@type'?: Arrayable<ValidServiceSubTypes>
  'name': string
  'description'?: string
  'serviceType'?: string
  'provider'?: NodeRelation<Person | Organization>
  'areaServed'?: string | unknown
  'availableChannel'?: ServiceChannel | ServiceChannel[]
  'audience'?: unknown
  'category'?: string | string[]
  'hasOfferCatalog'?: unknown
  'offers'?: NodeRelations<Offer>
  'aggregateRating'?: NodeRelation<AggregateRating>
  'review'?: NodeRelations<Review>
  'image'?: NodeRelations<ImageObject | string>
  'logo'?: NodeRelations<ImageObject | string>
  'url'?: string
  'termsOfService'?: string
  'slogan'?: string
  'brand'?: NodeRelation<Organization>
}
```

## Related Schemas

- [Organization](/docs/schema-org/api/schema/organization): Service provider
- [LocalBusiness](/docs/schema-org/api/schema/local-business): Service location
- [Product](/docs/schema-org/api/schema/product): Related products
