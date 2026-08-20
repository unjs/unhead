import type {
  Arrayable,
  Identity,
  NodeRelation,
  NodeRelations,
  ResolvableDate,
  Thing,
} from '../../types'
import type { BreadcrumbList } from '../Breadcrumb'
import type { ImageObject } from '../Image'
import type { Organization } from '../Organization'
import type { Person } from '../Person'
import type { VideoObject } from '../Video'
import type { WebSite } from '../WebSite'
import type { ReadAction } from './ReadAction'
import { defineSchemaOrgResolver, resolveIdentityRelation, resolveRelation } from '../../core'
import {
  IdentityId,
  idReference,
  isHomePage,
  resolvableDateToIso,
  resolveDefaultType,
  setIfEmpty,
  withoutTrailingSlash,
} from '../../utils'
import { breadcrumbResolver, PrimaryBreadcrumbId } from '../Breadcrumb'
import { imageResolver } from '../Image'
import { organizationResolver } from '../Organization'
import { personResolver } from '../Person'
import { videoResolver } from '../Video'
import { PrimaryWebSiteId } from '../WebSite'
import { readActionResolver } from './ReadAction'

type ValidSubTypes = 'WebPage' | 'AboutPage' | 'CheckoutPage' | 'CollectionPage' | 'ContactPage' | 'FAQPage' | 'ItemPage' | 'MedicalWebPage' | 'ProfilePage' | 'QAPage' | 'RealEstateListing' | 'SearchResultsPage'

interface SpeakableSpecificationBase extends Thing {
  '@type'?: 'SpeakableSpecification'
}

export type SpeakableSpecification = SpeakableSpecificationBase & (
  | {
    cssSelector: Arrayable<string>
    xPath?: never
  }
  | {
    cssSelector?: never
    xPath: Arrayable<string>
  }
)

export interface WebPageElement extends Thing {
  '@type'?: 'WebPageElement'
  'cssSelector': Arrayable<string>
  'isAccessibleForFree': boolean
}

/**
 * A web page.
 * Every web page is implicitly assumed to be declared to be of type WebPage,
 * so the various properties about that webpage, such as breadcrumb may be used.
 */
export interface WebPageSimple extends Thing {
  ['@type']?: Arrayable<ValidSubTypes>
  /**
   * The unmodified canonical URL of the page.
   */
  url?: string
  /**
   * The title of the page.
   */
  name?: string
  /**
   * The page's meta description content.
   */
  description?: string
  /**
   * A reference-by-ID to the WebSite node.
   */
  isPartOf?: NodeRelation<WebSite>
  /**
   * A reference-by-ID to the Organisation node.
   * Note: Only for the home page.
   */
  about?: NodeRelation<Organization>
  /**
   * A reference-by-ID to the author of the web page.
   */
  author?: NodeRelation<Person | string>
  /**
   * The language code for the page; e.g., en-GB.
   */
  inLanguage?: Arrayable<string>
  /**
   * The time at which the page was originally published, in ISO 8601 format; e.g., 2015-10-31T16:10:29+00:00.
   */
  datePublished?: ResolvableDate
  /**
   * The time at which the page was created.
   */
  dateCreated?: ResolvableDate
  /**
   * The time at which the page was last modified, in ISO 8601 format; e.g., 2015-10-31T16:10:29+00:00.
   */
  dateModified?: ResolvableDate
  /**
   * A reference-by-ID to a node representing the page's featured image.
   */
  primaryImageOfPage?: NodeRelation<ImageObject | string>
  /**
   * A reference-by-ID to a node representing the page's breadrumb structure.
   */
  breadcrumb?: NodeRelation<BreadcrumbList>
  /**
   * An array of all videos in the page content, referenced by ID.
   */
  video?: NodeRelations<VideoObject>
  /**
   * A SpeakableSpecification object which identifies any content elements suitable for spoken results.
   */
  speakable?: NodeRelations<SpeakableSpecification>
  /**
   * Whether the page is available without a subscription or registration.
   */
  isAccessibleForFree?: boolean
  /**
   * Sections or creative works contained by this page.
   */
  hasPart?: NodeRelations<WebPageElement | Thing>
  /**
   * The time at which the page was last reviewed, in ISO 8601 format.
   */
  lastReviewed?: string
  /**
   * An array of keywords describing the page.
   */
  keywords?: string[]
  /**
   * Potential actions for this web page.
   *
   * Note it's on by default for most page types.
   */
  potentialAction?: Arrayable<ReadAction | Thing>
}

export interface WebPage extends WebPageSimple {}

export const speakableSpecificationResolver = defineSchemaOrgResolver<SpeakableSpecification>({
  defaults: {
    '@type': 'SpeakableSpecification',
  },
})

export const webPageElementResolver = defineSchemaOrgResolver<WebPageElement>({
  defaults: {
    '@type': 'WebPageElement',
  },
})

export const PrimaryWebPageId = '#webpage'

export const webPageResolver = defineSchemaOrgResolver<WebPage>({
  defaults({ meta }) {
    // try match the @type for the url
    const endPath = withoutTrailingSlash(meta.url.substring(meta.url.lastIndexOf('/') + 1))
    let type: ValidSubTypes = 'WebPage'
    switch (endPath) {
      case 'about':
      case 'about-us':
        type = 'AboutPage'
        break
      case 'search':
        type = 'SearchResultsPage'
        break
      case 'checkout':
        type = 'CheckoutPage'
        break
      case 'contact':
      case 'get-in-touch':
      case 'contact-us':
        type = 'ContactPage'
        break
      case 'faq':
        type = 'FAQPage'
        break
    }
    const defaults: Partial<WebPage> = {
      '@type': type,
    }
    return defaults
  },
  idPrefix: ['url', PrimaryWebPageId],
  inheritMeta: [
    { meta: 'title', key: 'name' },
    'description',
    'datePublished',
    'dateModified',
    'url',
  ],
  resolve(node, ctx) {
    node.dateCreated = resolvableDateToIso(node.dateCreated)
    node.dateModified = resolvableDateToIso(node.dateModified)
    node.datePublished = resolvableDateToIso(node.datePublished)

    resolveDefaultType(node, 'WebPage')

    node.about = resolveRelation(node.about, ctx, organizationResolver)
    node.breadcrumb = resolveRelation(node.breadcrumb, ctx, breadcrumbResolver)
    node.author = resolveRelation(node.author, ctx, personResolver)
    if (node.hasPart) {
      const resolvePart = (part: NodeRelation<WebPageElement | Thing>) => {
        const isPaywalledSection = typeof part === 'object'
          && part !== null
          && (part['@type'] === 'WebPageElement' || 'cssSelector' in part)
        return isPaywalledSection
          ? resolveRelation(part as WebPageElement, ctx, webPageElementResolver)
          : resolveRelation(part, ctx)
      }
      node.hasPart = Array.isArray(node.hasPart)
        ? node.hasPart.map(resolvePart)
        : resolvePart(node.hasPart)
    }
    node.primaryImageOfPage = resolveRelation(node.primaryImageOfPage, ctx, imageResolver)
    node.speakable = resolveRelation(node.speakable, ctx, speakableSpecificationResolver)
    node.video = resolveRelation(node.video, ctx, videoResolver)
    if (Array.isArray(node['@type']) && node['@type'].includes('ProfilePage')) {
      node.mainEntity = resolveIdentityRelation(node.mainEntity as NodeRelations<Identity>, ctx, {
        organization: organizationResolver,
        person: personResolver,
      }, {
        root: true,
      })
    }
    // actions may be a function that need resolving
    if (node.potentialAction) {
      const resolveAction = (action: ReadAction | Thing) => {
        if (!action || typeof action !== 'object')
          return action

        const type = action['@type']
        const isReadAction = type === 'ReadAction'
          || (Array.isArray(type) && type.includes('ReadAction'))
          || 'target' in action
        return isReadAction
          ? resolveRelation(action as ReadAction, ctx, readActionResolver)
          : resolveRelation(action, ctx)
      }
      node.potentialAction = Array.isArray(node.potentialAction)
        ? node.potentialAction.map(resolveAction)
        : resolveAction(node.potentialAction)
    }

    if (node['@type'] === 'WebPage' && ctx.meta.url) {
      // if the type hasn't been augmented
      setIfEmpty(node, 'potentialAction', [
        {
          '@type': 'ReadAction',
          'target': [ctx.meta.url],
        },
      ])
    }
    return node
  },
  resolveRootNode(webPage, { find, meta }) {
    const identity = find(IdentityId)
    const webSite = find(PrimaryWebSiteId)
    const logo = find('#logo')

    /*
     * When it's a homepage, add additional about property which references the identity of the site.
     */
    if (identity && isHomePage(meta))
      setIfEmpty(webPage, 'about', idReference(identity))

    if (logo)
      setIfEmpty(webPage, 'primaryImageOfPage', idReference(logo))

    if (webSite)
      setIfEmpty(webPage, 'isPartOf', idReference(webSite))

    // it's possible that adding a new web page will revert the breadcrumb data
    const breadcrumb = find(PrimaryBreadcrumbId)
    if (breadcrumb)
      setIfEmpty(webPage, 'breadcrumb', idReference(breadcrumb))

    return webPage
  },
})

export * from './ReadAction'
