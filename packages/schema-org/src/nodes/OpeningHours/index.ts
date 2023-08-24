import type { Arrayable, ResolvableDate, Thing } from '../../types'
import { defineSchemaOrgResolver } from '../../core'

type DayOfWeek = 'Friday' |
'Monday' |
'PublicHolidays' |
'Saturday' |
'Sunday' |
'Thursday' |
'Tuesday' |
'Wednesday'

type Time = `${number}${number}:${number}${number}`

export interface OpeningHoursSimple extends Thing {
  '@type'?: 'OpeningHoursSpecification'
  /**
   * The day of the week for which these opening hours are valid.
   */
  dayOfWeek: Arrayable<DayOfWeek>
  /**
   * The opening hour of the place or service on the given day(s) of the week.
   */
  opens?: Time
  /**
   * The closing hour of the place or service on the given day(s) of the week.
   */
  closes?: Time
  /**
   * The date when the item becomes valid.
   */
  validFrom?: ResolvableDate
  /**
   * The date after when the item is not valid. For example, the end of an offer, salary period, or a period of opening hours.
   */
  validThrough?: ResolvableDate
}

export interface OpeningHoursSpecification extends OpeningHoursSimple {}

export const openingHoursResolver = defineSchemaOrgResolver<OpeningHoursSpecification>({
  defaults: {
    '@type': 'OpeningHoursSpecification',
    'opens': '00:00',
    'closes': '23:59',
  },
})
