import type { Arrayable, InteractionCounter, NodeRelation, NodeRelations, OptionalSchemaOrgPrefix, PropertyValue, ResolvableDate, Thing } from '../../types'
import type { DefinedRegion } from '../DefinedRegion'
import type { ImageObject } from '../Image'
import type { MerchantReturnPolicy } from '../MerchantReturnPolicy'
import type { MonetaryAmount, QuantitativeValue } from '../MonetaryAmount'
import type { UnitPriceSpecification } from '../Offer'
import type { PostalAddress } from '../PostalAddress'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { interactionCounterResolver, propertyValueResolver } from '../../core/common'
import {
  asArray,
  IdentityId,
  idReference,
  prefixId,
  resolvableDateToIso,
  resolveAsGraphKey,
  resolveDefaultType,
  resolveWithBase,
  setIfEmpty,
  withBase,
} from '../../utils'
import { definedRegionResolver } from '../DefinedRegion'
import { imageResolver, isImageObject } from '../Image'
import { merchantReturnPolicyResolver } from '../MerchantReturnPolicy'
import { monetaryAmountResolver, quantitativeValueResolver } from '../MonetaryAmount'
import { unitPriceSpecificationResolver } from '../Offer'
import { addressResolver } from '../PostalAddress'
import { PrimaryWebPageId } from '../WebPage'
import { PrimaryWebSiteId } from '../WebSite'

export interface ContactPoint extends Thing {
  '@type'?: 'ContactPoint'
  'contactType'?: string
  'email'?: string
  'telephone'?: string
  'areaServed'?: Arrayable<string | Thing>
  'availableLanguage'?: Arrayable<string>
}

export interface MemberProgramTier extends Thing {
  '@type'?: 'MemberProgramTier'
  'name': string
  'hasTierBenefit': Arrayable<OptionalSchemaOrgPrefix<'TierBenefitLoyaltyPoints' | 'TierBenefitLoyaltyPrice'>>
  'hasTierRequirement'?: NodeRelation<CreditCard | MonetaryAmount | UnitPriceSpecification | string>
  'membershipPointsEarned'?: NodeRelation<QuantitativeValue>
  'isTierOf'?: NodeRelation<MemberProgram>
  'url'?: string
}

export interface MemberProgram extends Thing {
  '@type'?: 'MemberProgram'
  'name': string
  'description': string
  'hasTiers': NodeRelations<MemberProgramTier>
  'url'?: string
}

export interface CreditCard extends Thing {
  '@type'?: 'CreditCard'
  'name': string
}

type FulfillmentType = OptionalSchemaOrgPrefix<'FulfillmentTypeCollectionPoint' | 'FulfillmentTypeDelivery'>
type ShippingDay = OptionalSchemaOrgPrefix<'Friday' | 'Monday' | 'Saturday' | 'Sunday' | 'Thursday' | 'Tuesday' | 'Wednesday'>

export interface ServicePeriod extends Thing {
  '@type'?: 'ServicePeriod'
  'businessDays'?: Arrayable<ShippingDay>
  'cutoffTime'?: string
  'duration'?: NodeRelation<QuantitativeValue>
}

type ShippingRate
  = | {
    orderPercentage: number
    weightPercentage?: never
  }
  | {
    orderPercentage?: never
    weightPercentage: number
  }

export type ShippingRateSettings = Thing & ShippingRate & {
  '@type'?: 'ShippingRateSettings'
}

export interface ShippingSeasonalOverride extends Thing {
  '@type'?: 'OpeningHoursSpecification'
  'dayOfWeek'?: Arrayable<ShippingDay>
  'opens'?: string
  'closes'?: string
  'validFrom'?: ResolvableDate
  'validThrough'?: ResolvableDate
}

export interface ShippingConditions extends Thing {
  '@type'?: 'ShippingConditions'
  'doesNotShip'?: boolean
  'numItems'?: NodeRelation<QuantitativeValue>
  'orderValue'?: NodeRelation<MonetaryAmount>
  'shippingDestination'?: NodeRelation<DefinedRegion>
  'shippingOrigin'?: NodeRelation<DefinedRegion>
  'seasonalOverride'?: NodeRelations<ShippingSeasonalOverride>
  'shippingRate'?: NodeRelation<MonetaryAmount | ShippingRateSettings>
  'transitTime'?: NodeRelation<ServicePeriod>
  'weight'?: NodeRelation<QuantitativeValue>
}

export interface ShippingService extends Thing {
  '@type'?: 'ShippingService'
  'shippingConditions': NodeRelations<ShippingConditions>
  'name'?: string
  'description'?: string
  'fulfillmentType'?: FulfillmentType
  'handlingTime'?: NodeRelation<ServicePeriod>
  'validForMemberTier'?: NodeRelations<MemberProgramTier>
}

/**
 * An organization such as a school, NGO, corporation, club, etc.
 */
export interface OrganizationSimple extends Thing {
  /**
   * A reference-by-ID to an image of the organization's logo.
   *
   * - The image must be 112x112px, at a minimum.
   * - Make sure the image looks how you intend it to look on a purely white background
   * (for example, if the logo is mostly white or gray,
   * it may not look how you want it to look when displayed on a white background).
   */
  logo?: NodeRelations<ImageObject | string>
  /**
   * The site's home URL.
   */
  url?: string
  /**
   * The name of the Organization.
   */
  name: string
  /**
   * An alternate name for the organization.
   */
  alternateName?: string
  /**
   * Customer service and other contact points.
   */
  contactPoint?: NodeRelations<ContactPoint>
  /**
   * A description of the organization.
   */
  description?: string
  /**
   * Data Universal Numbering System identifier.
   */
  duns?: string
  /**
   * An array of URLs representing declared social/authoritative profiles of the organization
   * (e.g., a Wikipedia page, or Facebook profile).
   */
  sameAs?: Arrayable<string>
  /**
   * An array of images which represent the organization (including the logo ), referenced by ID.
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * A reference-by-ID to an PostalAddress piece.
   */
  address?: NodeRelations<PostalAddress>
  /**
   * The telephone number of the organization.
   */
  telephone?: string
  /**
   * The email address of the organization.
   */
  email?: string
  /**
   * The date the organization was founded.
   */
  foundingDate?: string
  /**
   * Global Location Number.
   */
  globalLocationNumber?: string
  /**
   * Merchant return policies used by the organization.
   */
  hasMerchantReturnPolicy?: NodeRelations<MerchantReturnPolicy>
  /**
   * Membership programs offered by the organization.
   */
  hasMemberProgram?: NodeRelations<MemberProgram>
  /**
   * Shipping services offered by the organization.
   */
  hasShippingService?: NodeRelations<ShippingService>
  /**
   * ISO 6523 organization identifier.
   */
  iso6523Code?: string
  /**
   * The registered legal name.
   */
  legalName?: string
  /**
   * Legal Entity Identifier.
   */
  leiCode?: string
  /**
   * North American Industry Classification System code.
   */
  naics?: string
  /**
   * The number of employees.
   */
  numberOfEmployees?: NodeRelation<QuantitativeValue>
  /**
   * Tax identifier.
   */
  taxID?: string
  /**
   * VAT identifier.
   */
  vatID?: string
  /**
   * Organization identifiers used by profile and merchant features.
   */
  identifier?: NodeRelations<PropertyValue | string>
  /**
   * Counts of interactions performed by the organization.
   */
  agentInteractionStatistic?: NodeRelations<InteractionCounter>
  /**
   * Counts of interactions with the organization.
   */
  interactionStatistic?: NodeRelations<InteractionCounter>
}

export interface Organization extends OrganizationSimple {}

const contactPointResolver = defineSchemaOrgResolver<ContactPoint>({
  defaults: {
    '@type': 'ContactPoint',
  },
})

const creditCardResolver = defineSchemaOrgResolver<CreditCard>({
  defaults: {
    '@type': 'CreditCard',
  },
})

export const memberProgramTierResolver = defineSchemaOrgResolver<MemberProgramTier>({
  defaults: {
    '@type': 'MemberProgramTier',
  },
  resolve(node, ctx) {
    node.hasTierBenefit = (Array.isArray(node.hasTierBenefit)
      ? node.hasTierBenefit.map(benefit => withBase(benefit, 'https://schema.org/'))
      : withBase(node.hasTierBenefit, 'https://schema.org/')) as MemberProgramTier['hasTierBenefit']
    if (node.hasTierRequirement) {
      const requirement = node.hasTierRequirement
      if (typeof requirement === 'object') {
        const types = asArray(requirement['@type'])
        if (types.includes('CreditCard')) {
          node.hasTierRequirement = resolveRelation(requirement as NodeRelation<CreditCard>, ctx, creditCardResolver)
        }
        else if (types.includes('MonetaryAmount') || 'currency' in requirement) {
          node.hasTierRequirement = resolveRelation(requirement as NodeRelation<MonetaryAmount>, ctx, monetaryAmountResolver)
        }
        else {
          node.hasTierRequirement = resolveRelation(requirement as NodeRelation<UnitPriceSpecification>, ctx, unitPriceSpecificationResolver)
        }
      }
    }
    // MemberProgram and MemberProgramTier may reference each other.
    // eslint-disable-next-line ts/no-use-before-define
    node.isTierOf = resolveRelation(node.isTierOf, ctx, memberProgramResolver)
    node.membershipPointsEarned = resolveRelation(node.membershipPointsEarned, ctx, quantitativeValueResolver)
    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)
    return node
  },
})

const memberProgramResolver = defineSchemaOrgResolver<MemberProgram>({
  defaults: {
    '@type': 'MemberProgram',
  },
  resolve(node, ctx) {
    node.hasTiers = resolveRelation(node.hasTiers, ctx, memberProgramTierResolver)
    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)
    return node
  },
})

const servicePeriodResolver = defineSchemaOrgResolver<ServicePeriod>({
  defaults: {
    '@type': 'ServicePeriod',
  },
  resolve(node, ctx) {
    node.duration = resolveRelation(node.duration, ctx, quantitativeValueResolver)
    return node
  },
})

const shippingRateSettingsResolver = defineSchemaOrgResolver<ShippingRateSettings>({
  defaults: {
    '@type': 'ShippingRateSettings',
  },
})

const shippingSeasonalOverrideResolver = defineSchemaOrgResolver<ShippingSeasonalOverride>({
  defaults: {
    '@type': 'OpeningHoursSpecification',
  },
  resolve(node) {
    node.validFrom = resolvableDateToIso(node.validFrom)
    node.validThrough = resolvableDateToIso(node.validThrough)
    return node
  },
})

const shippingConditionsResolver = defineSchemaOrgResolver<ShippingConditions>({
  defaults: {
    '@type': 'ShippingConditions',
  },
  resolve(node, ctx) {
    node.numItems = resolveRelation(node.numItems, ctx, quantitativeValueResolver)
    node.orderValue = resolveRelation(node.orderValue, ctx, monetaryAmountResolver)
    node.seasonalOverride = resolveRelation(node.seasonalOverride, ctx, shippingSeasonalOverrideResolver)
    node.shippingDestination = resolveRelation(node.shippingDestination, ctx, definedRegionResolver)
    node.shippingOrigin = resolveRelation(node.shippingOrigin, ctx, definedRegionResolver)
    if (node.shippingRate) {
      const isSettings = typeof node.shippingRate === 'object'
        && ('orderPercentage' in node.shippingRate || 'weightPercentage' in node.shippingRate)
      node.shippingRate = isSettings
        ? resolveRelation(node.shippingRate as NodeRelation<ShippingRateSettings>, ctx, shippingRateSettingsResolver)
        : resolveRelation(node.shippingRate as NodeRelation<MonetaryAmount>, ctx, monetaryAmountResolver)
    }
    node.transitTime = resolveRelation(node.transitTime, ctx, servicePeriodResolver)
    node.weight = resolveRelation(node.weight, ctx, quantitativeValueResolver)
    return node
  },
})

const shippingServiceResolver = defineSchemaOrgResolver<ShippingService>({
  defaults: {
    '@type': 'ShippingService',
  },
  resolve(node, ctx) {
    if (node.fulfillmentType)
      node.fulfillmentType = withBase(node.fulfillmentType, 'https://schema.org/') as FulfillmentType
    node.handlingTime = resolveRelation(node.handlingTime, ctx, servicePeriodResolver)
    node.shippingConditions = resolveRelation(node.shippingConditions, ctx, shippingConditionsResolver)!
    node.validForMemberTier = resolveRelation(node.validForMemberTier, ctx, memberProgramTierResolver)
    return node
  },
})

/**
 * Describes an organization (a company, business or institution).
 * Most commonly used to identify the publisher of a WebSite.
 *
 * May be transformed into a more specific type
 * (such as Corporation or LocalBusiness) if the required conditions are met.
 */
export const organizationResolver
  = defineSchemaOrgResolver<Organization, Organization | string>({
    cast(node) {
      if (typeof node === 'string') {
        return {
          name: node,
        }
      }
      return node
    },
    defaults: {
      '@type': 'Organization',
    },
    idPrefix: ['host', IdentityId],
    inheritMeta: [
      { meta: 'host', key: 'url' },
    ],
    resolve(node, ctx) {
      resolveDefaultType(node, 'Organization')
      node.address = resolveRelation(node.address, ctx, addressResolver)
      node.agentInteractionStatistic = resolveRelation(node.agentInteractionStatistic, ctx, interactionCounterResolver)
      node.contactPoint = resolveRelation(node.contactPoint, ctx, contactPointResolver)
      node.hasMemberProgram = resolveRelation(node.hasMemberProgram, ctx, memberProgramResolver)
      node.hasMerchantReturnPolicy = resolveRelation(node.hasMerchantReturnPolicy, ctx, merchantReturnPolicyResolver)
      node.hasShippingService = resolveRelation(node.hasShippingService, ctx, shippingServiceResolver)
      if (node.identifier) {
        const resolveIdentifier = (identifier: NodeRelation<PropertyValue | string>) => typeof identifier === 'string'
          ? identifier
          : resolveRelation(identifier as NodeRelation<PropertyValue>, ctx, propertyValueResolver)
        node.identifier = Array.isArray(node.identifier)
          ? node.identifier.map(resolveIdentifier)
          : resolveIdentifier(node.identifier)
      }
      node.interactionStatistic = resolveRelation(node.interactionStatistic, ctx, interactionCounterResolver)
      node.numberOfEmployees = resolveRelation(node.numberOfEmployees, ctx, quantitativeValueResolver)
      if (node.url)
        node.url = resolveWithBase(ctx.meta.host, node.url)
      return node
    },
    resolveRootNode(node, ctx) {
      const isIdentity = resolveAsGraphKey(node['@id']) === IdentityId
      const webPage = ctx.find(PrimaryWebPageId)
      if (node.logo && isIdentity) {
        const logoInput = Array.isArray(node.logo) ? node.logo[0] : node.logo
        // Google expects a single logo, so use the first configured image.
        const logoNode = resolveRelation(logoInput, ctx, imageResolver, {
          root: true,
          afterResolve(logo) {
            logo['@id'] = prefixId(ctx.meta.host, '#logo')
            setIfEmpty(logo, 'caption', node.name)
          },
        })

        if (webPage && logoNode)
          setIfEmpty(webPage, 'primaryImageOfPage', idReference(logoNode))

        if (node['@type'] === 'Organization') {
          node.logo = logoNode
        }
        // Specialized organizations retain a compact Organization node for
        // Google's Organization rich result.
        // eslint-disable-next-line e18e/prefer-array-some -- ctx.find is not Array.find
        else if (!ctx.find('#organization')) {
          const resolvedLogo = logoNode && typeof logoNode === 'object' && logoNode['@id']
            ? ctx.find(logoNode['@id'], isImageObject)
            : null

          // push a separate node that will just be used for the Logo rich result
          ctx.nodes.push({
            // we want to make a simple node that has the essentials, this will allow parent nodes to inject
            // as well without inserting invalid data (i.e LocalBusiness operatingHours)
            '@type': 'Organization',
            'name': node.name,
            'url': node.url,
            'sameAs': node.sameAs,
            // 'image': idReference(logoNode),
            'address': node.address,
            // needs to be a URL
            'logo': resolvedLogo?.url,
            '_priority': -1,
            '@id': prefixId(ctx.meta.host, '#organization'), // avoid the id so nothing can link to it
          })
        }
        if (node['@type'] !== 'Organization')
          delete node.logo
      }

      if (isIdentity && webPage)
        setIfEmpty(webPage, 'about', idReference(node as Organization))

      const webSite = ctx.find(PrimaryWebSiteId)
      if (webSite)
        setIfEmpty(webSite, 'publisher', idReference(node as Organization))
    },
  })
