import type {
  Identity,
  NodeRelation,
  NodeRelations,
  OptionalSchemaOrgPrefix,
  ResolvableDate,
  Thing,
} from '../../types'
import type { ImageObject } from '../Image'
import type { Offer } from '../Offer'
import type { Person } from '../Person'
import type { Place } from '../Place'
import type { VirtualLocation } from '../VirtualLocation'
import { withBase } from 'ufo'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import {
  IdentityId,
  idReference,
  resolvableDateToDate,
  resolvableDateToIso,
  setIfEmpty,
} from '../../utils'
import { offerResolver } from '../Offer'
import { organizationResolver } from '../Organization'
import { personResolver } from '../Person'
import { placeResolver } from '../Place'
import { virtualLocationResolver } from '../VirtualLocation'

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
  /**
   * The duration of the item (movie, audio recording, event, etc.) in ISO 8601 date format.
   */
  duration?: string
  /**
   * Indicates whether an event is accessible for free.
   */
  isAccessibleForFree?: boolean
  /**
   * The total number of individuals that may attend an event or venue.
   */
  maximumAttendeeCapacity?: number
}

export interface Event extends EventSimple {}

export const PrimaryEventId = '#event'

/**
 * Describes an Event.
 */
export const eventResolver = defineSchemaOrgResolver<Event>({
  defaults: {
    '@type': 'Event',
  },
  inheritMeta: [
    'inLanguage',
    'description',
    'image',
    { meta: 'title', key: 'name' },
  ],
  idPrefix: ['url', PrimaryEventId],
  resolve(node, ctx) {
    if (node.location) {
      const resolveLocation = (location: NodeRelation<Place | VirtualLocation | string>) => {
        const type = typeof location === 'object' && location !== null ? location['@type'] : undefined
        const isVirtual = typeof location === 'string'
          || (typeof location === 'object' && location !== null && (
            type === 'VirtualLocation'
            || (Array.isArray(type) && type.includes('VirtualLocation'))
            || typeof (location as { url?: unknown }).url !== 'undefined'
          ))
        return isVirtual
          ? resolveRelation(location as NodeRelation<VirtualLocation | string>, ctx, virtualLocationResolver)
          : resolveRelation(location as NodeRelation<Place>, ctx, placeResolver)
      }
      if (Array.isArray(node.location)) {
        const locations = node.location.map(resolveLocation)
        node.location = locations.length === 1 ? locations[0] : locations
      }
      else {
        node.location = resolveLocation(node.location)
      }
    }

    node.performer = resolveRelation(node.performer, ctx, personResolver, {
      root: true,
    })
    node.organizer = resolveRelation(node.organizer, ctx, organizationResolver, {
      root: true,
    })
    node.offers = resolveRelation(node.offers, ctx, offerResolver)

    if (node.eventAttendanceMode)
      node.eventAttendanceMode = withBase(node.eventAttendanceMode, 'https://schema.org/') as OptionalSchemaOrgPrefix<EventAttendanceModeTypes>
    if (node.eventStatus)
      node.eventStatus = withBase(node.eventStatus, 'https://schema.org/') as OptionalSchemaOrgPrefix<EventStatusTypes>

    const isOnline = node.eventStatus === 'https://schema.org/EventMovedOnline'
      || node.eventAttendanceMode === 'https://schema.org/OnlineEventAttendanceMode'

    // dates
    const dates = ['startDate', 'previousStartDate', 'endDate'] as const
    // offline events can be passed as simple date strings because it will use the event location
    dates.forEach((date) => {
      if (!isOnline) {
        if (node[date] instanceof Date && node[date].getHours() === 0 && node[date].getMinutes() === 0)
          node[date] = resolvableDateToDate(node[date])
      }
      else {
        node[date] = resolvableDateToIso(node[date])
      }
    })
    setIfEmpty(node, 'endDate', node.startDate)
    return node
  },
  resolveRootNode(node, { find }) {
    const identity = find(IdentityId)
    if (identity)
      setIfEmpty(node, 'organizer', idReference(identity))
  },
})

export * from '../Place'
export * from '../VirtualLocation'
