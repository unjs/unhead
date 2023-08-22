import type { Arrayable, Identity, NodeRelations, Thing } from '../../types'
import {
  IdentityId,
  idReference,
  resolveAsGraphKey, setIfEmpty,
} from '../../utils'
import type { Person } from '../Person'
import type { Organization } from '../Organization'
import type { WebPage } from '../WebPage'
import { PrimaryWebPageId } from '../WebPage'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import type { SearchAction } from './SearchAction'
import { searchActionResolver } from './SearchAction'

/**
 * A WebSite is a set of related web pages and other items typically served from a single web domain and accessible via URLs.
 */
export interface WebSiteSimple extends Thing {
  /**
   * The site's home URL (excluding a trailing slash).
   */
  url?: string
  /**
   * The name of the website.
   */
  name: string
  /**
   * A description of the website (e.g., the site's tagline).
   */
  description?: string
  /**
   * A reference-by-ID to the Organization which publishes the WebSite
   * (or an array of Organization and Person in the case that the website represents an individual).
   */
  publisher?: NodeRelations<Identity>
  /**
   * A SearchAction object describing the site's internal search.
   */
  potentialAction?: Arrayable<(SearchAction | unknown)>
  /**
   * The language code for the WebSite; e.g., en-GB.
   * If the website is available in multiple languages, then output an array of inLanguage values.
   */
  inLanguage?: Arrayable<string>
}

export interface WebSite extends WebSiteSimple {}

export const PrimaryWebSiteId = '#website'

export const webSiteResolver = defineSchemaOrgResolver<WebSite>({
  defaults: {
    '@type': 'WebSite',
  },
  inheritMeta: [
    'inLanguage',
    { meta: 'host', key: 'url' },
  ],
  idPrefix: ['host', PrimaryWebSiteId],
  resolve(node, ctx) {
    // actions may be a function that need resolving
    node.potentialAction = resolveRelation(node.potentialAction, ctx, searchActionResolver, {
      array: true,
    })
    node.publisher = resolveRelation(node.publisher, ctx)
    return node
  },
  resolveRootNode(node, { find }) {
    // if this person is the identity
    if (resolveAsGraphKey(node['@id']) === PrimaryWebSiteId) {
      const identity = find<Person | Organization>(IdentityId)
      if (identity)
        setIfEmpty(node, 'publisher', idReference(identity))

      const webPage = find<WebPage>(PrimaryWebPageId)

      if (webPage)
        setIfEmpty(webPage, 'isPartOf', idReference(node))
    }
    return node
  },
})

export * from './SearchAction'
