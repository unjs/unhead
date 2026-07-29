---
title: SoftwareApplication Schema - JSON-LD Guide & Examples
description: Implement SoftwareApplication structured data with Unhead. See JSON-LD examples for app listings, ratings, pricing, and platform compatibility.
navigation:
  title: SoftwareApplication
---

SoftwareApplication schema describes a software product with its features, pricing, ratings, and platform compatibility. Supported markup can make an app page eligible for a [Google software app rich result](https://developers.google.com/search/docs/appearance/structured-data/software-app).

## JSON-LD Example

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Photo Editor Pro",
  "operatingSystem": "Windows, macOS",
  "applicationCategory": "DesignApplication",
  "offers": {
    "@type": "Offer",
    "price": "9.99",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "ratingCount": 1250
  }
}
```

::tip{icon="i-heroicons-wrench-screwdriver"}
Use the [Schema.org Generator](/tools/schema-generator) to build your structured data visually.
::

## Schema.org SoftwareApp

- **Type**: `defineSoftwareApp<T extends Record<string, any>>(input?: SoftwareApp & T)`{lang="ts"}

  Describes a SoftwareApp.

## Useful Links

- [SoftwareApplication - Schema.org](https://schema.org/SoftwareApplication)
- [SoftwareApp Schema Markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/software-app)

## Defaults and resolves

- `@type` defaults to `SoftwareApplication`; a different supported string type is augmented with `SoftwareApplication`.
- A root app receives an ID such as `${canonicalUrl}#/schema/software-application/{n}`.
- `offers`, `aggregateRating`, and `review` are resolved with their corresponding nested resolvers.

The input type requires `name`, `offers`, and either `aggregateRating` or `review`. Each Offer requires a direct price or a price specification. A free app still needs `offers.price: 0`; Unhead performs no runtime eligibility validation. See [Google's SoftwareApplication property table](https://developers.google.com/search/docs/appearance/structured-data/software-app#structured-data-type-definitions).

## Example

```ts
defineSoftwareApp({
  name: 'Angry Birds',
  operatingSystem: 'ANDROID',
  applicationCategory: 'GameApplication',
  aggregateRating: {
    ratingValue: '4.6',
    ratingCount: 8864,
  },
  offers: {
    price: '1.00',
    priceCurrency: 'USD',
  },
})
```

## Types

```ts
type ApplicationCategory
  = 'GameApplication'
    | 'SocialNetworkingApplication'
    | 'TravelApplication'
    | 'ShoppingApplication'
    | 'SportsApplication'
    | 'LifestyleApplication'
    | 'BusinessApplication'
    | 'DesignApplication'
    | 'DeveloperApplication'
    | 'DriverApplication'
    | 'EducationalApplication'
    | 'HealthApplication'
    | 'FinanceApplication'
    | 'SecurityApplication'
    | 'BrowserApplication'
    | 'CommunicationApplication'
    | 'DesktopEnhancementApplication'
    | 'EntertainmentApplication'
    | 'MultimediaApplication'
    | 'HomeApplication'
    | 'UtilitiesApplication'
    | 'ReferenceApplication'

interface SoftwareAppBase extends Thing {
  '@type'?: Arrayable<'SoftwareApplication' | 'MobileApplication' | 'VideoGame' | 'WebApplication'>
  /**
   * The name of the app.
   */
  'name': string
  /**
   * An offer to sell the app.
   * For developers, offers can indicate the marketplaces that carry the application.
   * For marketplaces, use offers to indicate the price of the app for a specific app instance.
   */
  'offers': NodeRelations<Offer>
  /**
   * The type of app (for example, BusinessApplication or GameApplication). The value must be a supported app type.
   */
  'applicationCategory'?: ApplicationCategory
  /**
   * The operating system(s) required to use the app (for example, Windows 7, OSX 10.6, Android 1.6)
   */
  'operatingSystem'?: string
  /**
   * A description of the app.
   */
  'description'?: string
  /**
   * URL to download the app.
   */
  'downloadUrl'?: string
  /**
   * The version of the app.
   */
  'softwareVersion'?: string
  /**
   * A list of features offered by the app.
   */
  'featureList'?: string[]
}

type SoftwareAppRating
  = | {
    aggregateRating: NodeRelation<AggregateRating>
    review?: NodeRelation<Review>
  }
  | {
    aggregateRating?: NodeRelation<AggregateRating>
    review: NodeRelation<Review>
  }

export type SoftwareAppSimple = SoftwareAppBase & SoftwareAppRating
```

## Related Schemas

- [Organization](/docs/schema-org/api/schema/organization): App developer/publisher
- [Person](/docs/schema-org/api/schema/person): App author
