## Schema.org Event

- **Type**: `defineEvent(input?: Event)`{lang="ts"}

  Describes an Event.

- **Component**: `SchemaOrgEvent` _(see [how components work](/guide/guides/components))_

## Useful Links

- [Schema.org Event](https://schema.org/Event)
- [Event Schema Markup - Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/event)

::alert{type="warning"}
🔨 Documentation in progress
::

## Examples

```ts
defineEvent({
  name: 'The Adventures of Kira and Morrison',
  location: [
    'https://operaonline.stream5.com/',
    {
      name: 'Snickerpark Stadium',
      address: {
        streetAddress: '100 West Snickerpark Dr',
        addressLocality: 'Snickertown',
        postalCode: '19019',
        addressRegion: 'PA',
        addressCountry: 'US',
      },
    },
  ],
  image: [
    'https://example.com/photos/1x1/photo.jpg',
    'https://example.com/photos/4x3/photo.jpg',
    'https://example.com/photos/16x9/photo.jpg',
  ],
  organizer: {
    name: 'Kira and Morrison Music',
    url: 'https://kiraandmorrisonmusic.com',
  },
  performer: {
    '@type': 'PerformingGroup',
    'name': 'Kira and Morrison',
  },
  offers: {
    price: 30,
    url: 'https://www.example.com/event_offer/12345_201803180430',
    validFrom: new Date(Date.UTC(2024, 5, 21, 12)),
  },
  description: 'The Adventures of Kira and Morrison is coming to Snickertown in a can\'t miss performance.',
  startDate: '2025-07-21T19:00-05:00',
  endDate: '2025-07-21T23:00-05:00',
  eventStatus: 'EventScheduled',
  eventAttendanceMode: 'MixedEventAttendanceMode',
})
```

## Types

```ts
type EventAttendanceModeTypes = 'OfflineEventAttendanceMode' | 'OnlineEventAttendanceMode' | 'MixedEventAttendanceMode'
type EventStatusTypes = 'EventCancelled' | 'EventMovedOnline' | 'EventPostponed' | 'EventRescheduled' | 'EventScheduled'

export interface EventSimple extends Thing {
  /**
   * Description of the event.
   * Describe all details of the event to make it easier for users to understand and attend the event.
   */
  description?: string
  /**
   * The end date and time of the item (in ISO 8601 date format).
   */
  endDate?: ResolvableDate
  /**
   * The eventAttendanceMode of an event indicates whether it occurs online, offline, or a mix.
   */
  eventAttendanceMode?: OptionalSchemaOrgPrefix<EventAttendanceModeTypes>
  /**
   * An eventStatus of an event represents its status; particularly useful when an event is cancelled or rescheduled.
   */
  eventStatus?: OptionalSchemaOrgPrefix<EventStatusTypes>
  /**
   * Repeated ImageObject or URL
   *
   * URL of an image or logo for the event or tour.
   * Including an image helps users understand and engage with your event.
   * We recommend that images are 1920px wide (the minimum width is 720px).
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * The location of the event.
   * There are different requirements depending on if the event is happening online or at a physical location
   */
  location?: NodeRelations<Place | VirtualLocation | string>
  /**
   * An offer to provide this item—for example, an offer to sell a product,
   * rent the DVD of a movie, perform a service, or give away tickets to an event.
   * Use businessFunction to indicate the kind of transaction offered, i.e. sell, lease, etc.
   * This property can also be used to describe a Demand.
   * While this property is listed as expected on a number of common types, it can be used in others.
   * In that case, using a second type, such as Product or a subtype of Product, can clarify the nature of the offer.
   */
  offers?: NodeRelations<Offer | string>
  /**
   * An organizer of an Event.
   */
  organizer?: NodeRelation<Identity>
  /**
   * A performer at the event—for example, a presenter, musician, musical group or actor.
   */
  performer?: NodeRelation<Person>
  /**
   * Used in conjunction with eventStatus for rescheduled or cancelled events.
   * This property contains the previously scheduled start date.
   * For rescheduled events, the startDate property should be used for the newly scheduled start date.
   * In the (rare) case of an event that has been postponed and rescheduled multiple times, this field may be repeated.
   */
  previousStartDate?: ResolvableDate
  /**
   * The start date and time of the item (in ISO 8601 date format).
   */
  startDate?: ResolvableDate
}
```
