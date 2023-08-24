import type { Thing } from '../../types'
import { defineSchemaOrgResolver } from '../../core'

export interface PostalAddressSimple extends Thing {
  /**
   * The building number and street (e.g., 123 fake road ).
   */
  streetAddress: string
  /**
   * The postal code.
   */
  postalCode: string
  /**
   * The two-digit country-code representing the country (e.g., US ).
   */
  addressCountry: string
  /**
   * The town, city or equivalent.
   */
  addressLocality?: string
  /**
   * The region or district.
   */
  addressRegion?: string
  /**
   * A PO box number.
   */
  postOfficeBoxNumber?: string
}

export interface PostalAddress extends PostalAddressSimple {}

export const addressResolver = defineSchemaOrgResolver<PostalAddress>({
  defaults: {
    '@type': 'PostalAddress',
  },
})
