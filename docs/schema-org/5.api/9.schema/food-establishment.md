---
title: Food Establishment Schema
description: Use defineFoodEstablishment() to describe a food-related business, including its menu, reservations, cuisine, address, and opening hours.
---

## Schema.org FoodEstablishment

**Type**: `defineFoodEstablishment<T extends Record<string, any>>(input?: FoodEstablishment & T)`{lang="ts"}

  Describes a food-related business.

## Useful Links

- [FoodEstablishment - Schema.org](https://schema.org/FoodEstablishment)
- [Local Business - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/local-business)

## Google requirements

For [Google's LocalBusiness feature](https://developers.google.com/search/docs/appearance/structured-data/local-business#local-business-properties), a FoodEstablishment needs both `name` and a physical `address`. Unhead resolves the address but does not require or validate it.

- **name** `string`

  The name of the business.

- **address** `NodeRelations<PostalAddress>`: [PostalAddress](https://schema.org/PostalAddress)

  The physical address of the business.

## Recommended Properties

- **acceptsReservations** `string | boolean`

  Indicates whether a FoodEstablishment accepts reservations.

- **hasMenu** `string`

  URL of the menu.

- **openingHoursSpecification**  `NodeRelations<OpeningHoursSpecification>`: [OpeningHoursSpecification](https://schema.org/OpeningHoursSpecification)

  The specification for when the business is open.

- **servesCuisine** `string`

  The type of cuisine the restaurant serves.

### Minimal Example

```ts
defineFoodEstablishment({
  name: 'Harbor Cafe',
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

- **@type**: `FoodEstablishment`
- **@id**: `${canonicalHost}#identity`
- **url**: `${canonicalHost}`
- **currenciesAccepted**: `currency` from resolved page metadata. See [global options](/docs/schema-org/guides/core-concepts/params)

## Sub-Types

- `Bakery`
- `BarOrPub`
- `Brewery`
- `Dentist`
- `CafeOrCoffeeShop`
- `Distillery`
- `FastFoodRestaurant`
- `IceCreamShop`
- `Restaurant`
- `Winery`

## Resolves

See [Global Resolves](/docs/schema-org/guides/get-started/overview#how-does-schemaorg-get-page-data) for full context.

- for the primary identity, a string `logo` creates a root ImageObject with the `#logo` ID and a compact Organization node with the absolute logo URL

- `@type` resolve: `Restaurant` -> `['Organization', 'LocalBusiness', 'FoodEstablishment', 'Restaurant']`

- `starRating` will be resolved as a [Rating](https://schema.org/Rating)

## Types

```ts
type ValidFoodEstablishmentSubTypes = 'Bakery'
  | 'BarOrPub'
  | 'Brewery'
  | 'Dentist'
  | 'CafeOrCoffeeShop'
  | 'Distillery'
  | 'FastFoodRestaurant'
  | 'IceCreamShop'
  | 'Restaurant'
  | 'Winery'

export interface FoodEstablishmentSimple extends Omit<LocalBusiness, '@type'> {
  '@type'?: ['Organization', 'LocalBusiness', 'FoodEstablishment'] | ['Organization', 'LocalBusiness', 'FoodEstablishment', ValidFoodEstablishmentSubTypes] | ValidFoodEstablishmentSubTypes
  /**
   * Indicates whether a FoodEstablishment accepts reservations.
   */
  'acceptsReservations'?: string | boolean
  /**
   * URL of the menu.
   */
  'hasMenu'?: string
  /**
   * Methods of payment accepted.
   */
  'paymentAccepted'?: string
  /**
   * The cuisine of the restaurant.
   */
  'servesCuisine'?: string
  /**
   * An official rating for a lodging business or food establishment
   */
  'starRating'?: NodeRelations<Rating>
}
```

## Related Schemas

- [LocalBusiness](/docs/schema-org/api/schema/local-business): Parent type
- [Organization](/docs/schema-org/api/schema/organization): Parent organization
- [Event](/docs/schema-org/api/schema/event): Restaurant events
