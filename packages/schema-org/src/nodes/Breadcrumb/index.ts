import {
  idReference,
  setIfEmpty,
} from '../../utils'
import type { WebPage } from '../WebPage'
import { PrimaryWebPageId } from '../WebPage'
import { listItemResolver } from '../ListItem'
import type { ItemList } from '../ItemList'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'

/**
 * A BreadcrumbList is an ItemList consisting of a chain of linked Web pages,
 * typically described using at least their URL and their name, and typically ending with the current page.
 */
export interface BreadcrumbSimple extends ItemList {
  '@type'?: 'BreadcrumbList'
}

export interface BreadcrumbList extends BreadcrumbSimple {}

export const PrimaryBreadcrumbId = '#breadcrumb'

/**
 * Describes the hierarchical position a WebPage within a WebSite.
 */
export const breadcrumbResolver = defineSchemaOrgResolver<BreadcrumbList>({
  defaults: {
    '@type': 'BreadcrumbList',
  },
  idPrefix: ['url', PrimaryBreadcrumbId],
  resolve(breadcrumb, ctx) {
    if (breadcrumb.itemListElement) {
      let index = 1

      breadcrumb.itemListElement = resolveRelation(breadcrumb.itemListElement, ctx, listItemResolver, {
        array: true,
        afterResolve(node) {
          setIfEmpty(node, 'position', index++)
        },
      })
    }
    return breadcrumb
  },
  resolveRootNode(node, { find }) {
    // merge breadcrumbs reference into the webpage
    const webPage = find<WebPage>(PrimaryWebPageId)
    if (webPage)
      setIfEmpty(webPage, 'breadcrumb', idReference(node))
  },
})
