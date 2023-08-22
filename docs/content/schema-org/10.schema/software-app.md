## Schema.org SoftwareApp

- **Type**: `defineSoftwareApp(input?: SoftwareApp)`{lang="ts"}

  Describes a SoftwareApp.

- **Component**: `SchemaOrgSoftwareApp` _(see [how components work](/guide/guides/components))_


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
type ApplicationCategory =
'GameApplication' |
'SocialNetworkingApplication' |
'TravelApplication' |
'ShoppingApplication' |
'SportsApplication' |
'LifestyleApplication' |
'BusinessApplication' |
'DesignApplication' |
'DeveloperApplication' |
'DriverApplication' |
'EducationalApplication' |
'HealthApplication' |
'FinanceApplication' |
'SecurityApplication' |
'BrowserApplication' |
'CommunicationApplication' |
'DesktopEnhancementApplication' |
'EntertainmentApplication' |
'MultimediaApplication' |
'HomeApplication' |
'UtilitiesApplication' |
'ReferenceApplication'

export interface SoftwareAppSimple extends Thing {
  '@type'?: Arrayable<'SoftwareApplication' | 'MobileApplication' | 'VideoGame' | 'WebApplication'>
  /**
   * The name of the app.
   */
  name?: string
  /**
   * An offer to sell the app.
   * For developers, offers can indicate the marketplaces that carry the application.
   * For marketplaces, use offers to indicate the price of the app for a specific app instance.
   */
  offers: NodeRelations<Offer>
  /**
   * The average review score of the app.
   */
  aggregateRating?: NodeRelation<AggregateRating>
  /**
   * A single review of the app.
   */
  review?: NodeRelation<Review>
  /**
   * The type of app (for example, BusinessApplication or GameApplication). The value must be a supported app type.
   */
  applicationCategory?: ApplicationCategory
  /**
   * The operating system(s) required to use the app (for example, Windows 7, OSX 10.6, Android 1.6)
   */
  operatingSystem?: string
}
```
