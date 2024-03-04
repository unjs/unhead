import { defineSchemaOrgResolver } from '../../core/define'
import type { Thing } from '../../types'

export interface DefinedRegion extends Thing {
  /**
   * The two-letter country code, in [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1) format.
   */
  addressCountry: string
  /**
   * If you include this property, the region must be a 2- or 3-digit ISO 3166-2 subdivision code, without country prefix. Currently, Google Search only supports the US, Australia, and Japan. Examples: "NY" (for US, state of New York), "NSW" (for Australia, state of New South Wales), or "03" (for Japan, Iwate prefecture).
   *
   * Do not provide both a region and postal code information.
   */
  addressRegion?: string
  /**
   * The postal code. For example, 94043. Currently postal codes are supported for Australia, Canada, and the US.
   */
  postalCode?: string
}

export const definedRegionResolver = defineSchemaOrgResolver<DefinedRegion>({
  defaults: {
    '@type': 'DefinedRegion',
  },
})
