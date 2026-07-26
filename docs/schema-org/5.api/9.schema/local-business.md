---
title: LocalBusiness Schema - JSON-LD Guide & Examples
description: Implement LocalBusiness structured data with Unhead. See JSON-LD examples, core properties, and subtypes such as Dentist, Restaurant, and Store.
navigation:
  title: LocalBusiness
---

[LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business) tells Google about a physical business location, including its name, address, opening hours, and services. A Google Business Profile is managed separately.

Use the most specific accurate subtype, such as `Dentist`, `Restaurant`, or `ProfessionalService`, rather than the generic `LocalBusiness` type.

## JSON-LD Example

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

::tip{icon="i-heroicons-wrench-screwdriver"}
Use the [Schema.org Generator](/tools/schema-generator) to build your structured data visually.
::

## Schema.org LocalBusiness

**Type**: `defineLocalBusiness<T extends Record<string, any>>(input?: LocalBusiness & T)`{lang="ts"}

  Describes a business that customers can visit. Use it for the business behind a website or on a page about a specific location.

## Useful Links

- [LocalBusiness - Schema.org](https://schema.org/LocalBusiness)
- [Local Business Schema Markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Choose an Identity - LocalBusiness](/docs/schema-org/guides/recipes/identity#localbusiness)

## Google requirements

Google requires both `name` and `address` for a LocalBusiness rich result. The Unhead input type inherits `name` from Organization but leaves `address` optional, so the helper does not enforce this requirement.

- **name** `string`

  The name of the business.

- **address** `NodeRelations<PostalAddress>`: [PostalAddress](https://schema.org/PostalAddress)

  The physical address of the business.

## Recommended Properties

- **openingHoursSpecification**  `NodeRelations<OpeningHoursSpecification>`: [OpeningHoursSpecification](https://schema.org/OpeningHoursSpecification)

  The specification for when the business is open.

- **paymentAccepted** `string`

  The methods of payment accepted by the business.

### Minimal Example

```ts
defineLocalBusiness({
  name: 'Harbor Dental',
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
- **currenciesAccepted**: `currency` from resolved page metadata. See [global options](/docs/schema-org/guides/core-concepts/params)

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

See [Global Resolves](/docs/schema-org/guides/get-started/overview#how-does-schemaorg-get-page-data) for full context.

- for the primary identity, a string `logo` creates a root ImageObject with the `#logo` ID and a compact Organization node with the absolute logo URL

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

- [Organization](/docs/schema-org/api/schema/organization): Parent organization
- [Event](/docs/schema-org/api/schema/event): Business events
- [Product](/docs/schema-org/api/schema/product): Products/services offered
