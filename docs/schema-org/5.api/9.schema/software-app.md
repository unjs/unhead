---
title: SoftwareApplication Schema - JSON-LD Guide & Examples
description: Implement SoftwareApplication structured data with Unhead. JSON-LD examples for app listings, ratings, pricing, and Google rich results.
navigation:
  title: SoftwareApplication
---

SoftwareApplication schema describes a software product with its features, pricing, ratings, and platform compatibility. It enables rich result display in Google Search with star ratings and pricing information.

### JSON-LD Example

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

With Unhead, generate this using the `defineSoftwareApp()` composable — see the [API reference](#schema-org-softwareapp) below.

::tip{icon="i-heroicons-wrench-screwdriver"}
Use the [Schema.org Generator](/tools/schema-generator) to build your structured data visually.
::

## Schema.org SoftwareApp

- **Type**: `defineSoftwareApp(input?: SoftwareApp)`{lang="ts"}

  Describes a SoftwareApp.

## Useful Links

- [Schema.org SoftwareApp](https://schema.org/SoftwareApp)
- [SoftwareApp Schema Markup - Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/software-app)

::alert{type="warning"}
🔨 Documentation in development
::

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

export interface SoftwareAppSimple extends Thing {
  '@type'?: Arrayable<'SoftwareApplication' | 'MobileApplication' | 'VideoGame' | 'WebApplication'>
  /**
   * The name of the app.
   */
  'name'?: string
  /**
   * An offer to sell the app.
   * For developers, offers can indicate the marketplaces that carry the application.
   * For marketplaces, use offers to indicate the price of the app for a specific app instance.
   */
  'offers': NodeRelations<Offer>
  /**
   * The average review score of the app.
   */
  'aggregateRating'?: NodeRelation<AggregateRating>
  /**
   * A single review of the app.
   */
  'review'?: NodeRelation<Review>
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
```

## Related Schemas

- [Organization](/docs/schema-org/api/schema/organization) - App developer/publisher
- [Person](/docs/schema-org/api/schema/person) - App author
