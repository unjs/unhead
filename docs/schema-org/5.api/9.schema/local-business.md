---
title: LocalBusiness Schema - JSON-LD Guide & Examples
description: Implement LocalBusiness structured data with Unhead. JSON-LD examples, required properties, subtypes (Dentist, Restaurant, Store), and Google rich result setup.
navigation:
  title: LocalBusiness
---

LocalBusiness schema tells search engines about a physical business location — its name, address, opening hours, and services. It powers Google's local business panels, Maps listings, and "near me" search results.

For better visibility, use a specific subtype like `Dentist`, `Restaurant`, or `ProfessionalService` rather than the generic `LocalBusiness` type.

### JSON-LD Example

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Dave's Steak House",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "148 W 51st St",
    "addressLocality": "New York",
    "addressRegion": "NY",
    "postalCode": "10019",
    "addressCountry": "US"
  },
  "telephone": "+12122459600",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "11:30",
      "closes": "23:00"
    }
  ]
}
```

With Unhead, generate this using the `defineLocalBusiness()` composable — see the [API reference](#schema-org-localbusiness) below.

::tip{icon="i-heroicons-wrench-screwdriver"}
Use the [Schema.org Generator](/tools/schema-generator) to build your structured data visually.
::

## Schema.org LocalBusiness

**Type**: `defineLocalBusiness(input?: LocalBusiness)`{lang="ts"}

  Describes a business which allows public visitation. Typically used to represent the business 'behind' the website, or on a page about a specific business.

## Useful Links

- [LocalBusiness - Schema.org](https://schema.org/LocalBusiness)
- [Local Business Schema Markup - Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/local-business)
- [LocalBusiness - Yoast](https://developer.yoast.com/features/schema/pieces/localBusiness)
- [Choose an Identity - Local Business](/docs/schema-org/guides/recipes/identity#local-business)

## Required properties

- **name** `string`

  The name of the business.

- **address** `AddressInput` - [PostalAddress](https://schema.org/PostalAddress)

  Physical postal address of the business.

## Recommended Properties

- **openingHoursSpecification**  `OpeningHoursInput[]` - [OpeningHoursSpecification](https://schema.org/OpeningHoursSpecification)

  The specification for when the business is open.

- **paymentAccepted** `string`

  The methods of payment accepted by the business.

### Minimal Example

```ts
defineLocalBusiness({
  name: 'test',
  logo: '/logo.png',
  address: {
    addressCountry: 'Australia',
    postalCode: '2000',
    streetAddress: '123 st',
  },
  openingHoursSpecification: [
    {
      dayOfWeek: 'Saturday',
      opens: '09:30',
      closes: '13:30',
    },
    {
      dayOfWeek: ['Monday', 'Tuesday'],
      opens: '10:30',
      closes: '15:30',
    },
  ]
})
```

## Defaults

- **@type**: `['Organization', 'LocalBusiness']`
- **@id**: `${canonicalHost}#identity`
- **url**: `${canonicalHost}`
- **currenciesAccepted**: `${options.defaultCurrency}` See [global options](/docs/schema-org/guides/core-concepts/params)

## Sub-Types

- `AnimalShelter`
- `ArchiveOrganization`
- `AutomotiveBusiness`
- `ChildCare`
- `Dentist`
- `DryCleaningOrLaundry`
- `EmergencyService`
- `EmploymentAgency`
- `EntertainmentBusiness`
- `FinancialService`
- `FoodEstablishment`
- `GovernmentOffice`
- `HealthAndBeautyBusiness`
- `HomeAndConstructionBusiness`
- `InternetCafe`
- `LegalService`
- `Library`
- `LodgingBusiness`
- `MedicalBusiness`
- `ProfessionalService`
- `RadioStation`
- `RealEstateAgent`
- `RecyclingCenter`
- `SelfStorage`
- `ShoppingCenter`
- `SportsActivityLocation`
- `Store`
- `TelevisionStation`
- `TouristInformationCenter`
- `TravelAgency`

## Resolves

See [Global Resolves](/docs/schema-org/guides/get-started/overview#site-page-level-config) for full context.

- `logo` will be resolved from a string into an ImageObject and added to `image`

- `@type` resolve: `Dentist` -> `['Organization', 'LocalBusiness', 'Dentist']`

## Types

```ts
type ValidLocalBusinessSubTypes = 'AnimalShelter'
  | 'ArchiveOrganization'
  | 'AutomotiveBusiness'
  | 'ChildCare'
  | 'Dentist'
  | 'DryCleaningOrLaundry'
  | 'EmergencyService'
  | 'EmploymentAgency'
  | 'EntertainmentBusiness'
  | 'FinancialService'
  | 'FoodEstablishment'
  | 'GovernmentOffice'
  | 'HealthAndBeautyBusiness'
  | 'HomeAndConstructionBusiness'
  | 'InternetCafe'
  | 'LegalService'
  | 'Library'
  | 'LodgingBusiness'
  | 'MedicalBusiness'
  | 'ProfessionalService'
  | 'RadioStation'
  | 'RealEstateAgent'
  | 'RecyclingCenter'
  | 'SelfStorage'
  | 'ShoppingCenter'
  | 'SportsActivityLocation'
  | 'Store'
  | 'TelevisionStation'
  | 'TouristInformationCenter'
  | 'TravelAgency'

export interface LocalBusinessSimple extends Organization {
  '@type'?: ['Organization', 'LocalBusiness'] | ['Organization', 'LocalBusiness', ValidLocalBusinessSubTypes] | ValidLocalBusinessSubTypes
  /**
   * The primary public telephone number of the business.
   */
  'telephone'?: string
  /**
   * The primary public email address of the business.
   */
  'email'?: string
  /**
   * The primary public fax number of the business.
   */
  'faxNumber'?: string
  /**
   * The price range of the business, represented by a string of dollar symbols (e.g., $, $$, or $$$ ).
   */
  'priceRange'?: string
  /**
   * An array of GeoShape, Place or string definitions.
   */
  'areaServed'?: unknown
  /**
   * A GeoCoordinates object.
   */
  'geo'?: unknown
  /**
   * The VAT ID of the business.
   */
  'vatID'?: string
  /**
   * The tax ID of the business.
   */
  'taxID'?: string
  /**
   * The currency accepted.
   */
  'currenciesAccepted'?: string
  /**
   * The methods of payment accepted by the business.
   */
  'paymentAccepted'?: string
  /**
   * The operating hours of the business.
   */
  'openingHoursSpecification'?: NodeRelations<OpeningHoursSpecification>
}
```

## Related Schemas

- [Organization](/docs/schema-org/api/schema/organization) - Parent organization
- [Event](/docs/schema-org/api/schema/event) - Business events
- [Product](/docs/schema-org/api/schema/product) - Products/services offered
