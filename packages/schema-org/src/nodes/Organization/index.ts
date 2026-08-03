import type { Arrayable, NodeRelation, NodeRelations, Thing } from '../../types'
import type { ImageObject } from '../Image'
import type { PostalAddress } from '../PostalAddress'
import type { WebPage } from '../WebPage'
import type { WebSite } from '../WebSite'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import {
  IdentityId,
  idReference,
  prefixId,
  resolveAsGraphKey,
  resolveDefaultType,
  setIfEmpty,
} from '../../utils'
import { imageResolver } from '../Image'
import { addressResolver } from '../PostalAddress'
import { PrimaryWebPageId } from '../WebPage'
import { PrimaryWebSiteId } from '../WebSite'

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
  logo?: NodeRelation<ImageObject | string>
  /**
   * The site's home URL.
   */
  url?: string
  /**
   * The name of the Organization.
   */
  name: string
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
}

export interface Organization extends OrganizationSimple {}

/**
 * Describes an organization (a company, business or institution).
 * Most commonly used to identify the publisher of a WebSite.
 *
 * May be transformed into a more specific type
 * (such as Corporation or LocalBusiness) if the required conditions are met.
 */
export const organizationResolver
  = defineSchemaOrgResolver<Organization>({
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
      return node
    },
    resolveRootNode(node, ctx) {
      const isIdentity = resolveAsGraphKey(node['@id']) === IdentityId
      const webPage = ctx.find<WebPage>(PrimaryWebPageId)
      if (node.logo && isIdentity) {
        const logoInput = Array.isArray(node.logo) ? node.logo[0] : node.logo
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
        else if (!ctx.find('#organization')) {
          const resolvedLogo = logoNode && typeof logoNode === 'object' && logoNode['@id']
            ? ctx.find<ImageObject>(logoNode['@id'])
            : null
          ctx.nodes.push({
            '@type': 'Organization',
            'name': node.name,
            'url': node.url,
            'sameAs': node.sameAs,
            'address': node.address,
            'logo': resolvedLogo?.url || resolvedLogo?.contentUrl,
            '_priority': -1,
            '@id': prefixId(ctx.meta.host, '#organization'),
          })
        }
        if (node['@type'] !== 'Organization')
          delete node.logo
      }

      if (isIdentity && webPage)
        setIfEmpty(webPage, 'about', idReference(node as Organization))

      const webSite = ctx.find<WebSite>(PrimaryWebSiteId)
      if (webSite)
        setIfEmpty(webSite, 'publisher', idReference(node as Organization))
    },
  })
