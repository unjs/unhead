import type {
  Arrayable,
  IdReference,
  Identity,
  NodeRelations,
  ResolvableDate,
  Thing,
} from '../../types'
import {
  IdentityId,
  asArray,
  idReference,
  resolvableDateToIso,
  resolveDefaultType,
  resolveWithBase,
  setIfEmpty, trimLength,
} from '../../utils'
import type { WebPage } from '../WebPage'
import { PrimaryWebPageId } from '../WebPage'
import type { ImageObject } from '../Image'
import type { VideoObject } from '../Video'
import { personResolver } from '../Person'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'

type ValidArticleSubTypes = 'Article' | 'BlogPosting' | 'AdvertiserContentArticle' | 'NewsArticle' | 'Report' | 'SatiricalArticle' | 'ScholarlyArticle' | 'SocialMediaPosting' | 'TechArticle'

export interface ArticleSimple extends Thing {
  ['@type']?: Arrayable<ValidArticleSubTypes>
  /**
   * The headline of the article (falling back to the title of the WebPage).
   * Headlines should not exceed 110 characters.
   */
  headline?: string
  /**
   * A summary of the article (falling back to the page's meta description content).
   */
  description?: string
  /**
   * A reference-by-ID to the WebPage node.
   */
  isPartOf?: IdReference
  /**
   * The time at which the article was originally published, in ISO 8601 format; e.g., 2015-10-31T16:10:29+00:00.
   */
  datePublished?: ResolvableDate
  /**
   * The time at which the article was last modified, in ISO 8601 format; e.g., 2015-10-31T16:10:29+00:00.
   */
  dateModified?: ResolvableDate
  /**
   * A reference-by-ID to the author of the article.
   */
  author?: NodeRelations<Identity>
  /**
   * A reference-by-ID to the publisher of the article.
   */
  publisher?: NodeRelations<Identity>
  /**
   * An array of all videos in the article content, referenced by ID.
   */
  video?: NodeRelations<VideoObject>
  /**
   * An image object or referenced by ID.
   * - Must be at least 696 pixels wide.
   * - Must be of the following formats+file extensions: .jpg, .png, .gif ,or .webp.
   *
   * Must have markup of it somewhere on the page.
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * An array of references by ID to comment pieces.
   */
  comment?: NodeRelations<Comment>
  /**
   * A thumbnail image relevant to the Article.
   */
  thumbnailUrl?: string
  /**
   * An integer value of the number of comments associated with the article.
   */
  commentCount?: number
  /**
   * An integer value of the number of words in the article.
   */
  wordCount?: number
  /**
   * An array of keywords which the article has (e.g., ["cats","dogs","cake"]).
   */
  keywords?: string[]
  /**
   * An array of category names which the article belongs to (e.g., ["cats","dogs","cake"]).
   */
  articleSection?: string[]
  /**
   * The language code for the article; e.g., en-GB.
   */
  inLanguage?: string
  /**
   * A SpeakableSpecification object which identifies any content elements suitable for spoken results.
   */
  speakable?: unknown
  /**
   * The year from which the article holds copyright status.
   */
  copyrightYear?: string
  /**
   * A reference-by-ID to the Organization or Person who holds the copyright.
   */
  copyrightHolder?: NodeRelations<Identity>
}

export interface Article extends ArticleSimple {}

export const PrimaryArticleId = '#article'

/**
 * Describes an Article on a WebPage.
 */
export const articleResolver = defineSchemaOrgResolver<Article>({
  defaults: {
    '@type': 'Article',
  },
  inheritMeta: [
    'inLanguage',
    'description',
    'image',
    'dateModified',
    'datePublished',
    { meta: 'title', key: 'headline' },
  ],
  idPrefix: ['url', PrimaryArticleId],
  resolve(node, ctx) {
    node.author = resolveRelation(node.author, ctx, personResolver, {
      root: true,
    })
    node.publisher = resolveRelation(node.publisher, ctx)
    node.dateModified = resolvableDateToIso(node.dateModified)
    node.datePublished = resolvableDateToIso(node.datePublished)
    resolveDefaultType(node, 'Article')

    // Headlines should not exceed 110 characters.
    node.headline = trimLength(node.headline, 110)
    return node
  },
  resolveRootNode(node, { find, meta }) {
    const webPage = find<WebPage>(PrimaryWebPageId)
    const identity = find<Identity>(IdentityId)

    if (node.image && !node.thumbnailUrl) {
      const firstImage = asArray(node.image)[0] as ImageObject
      if (typeof firstImage === 'string')
        setIfEmpty(node, 'thumbnailUrl', resolveWithBase(meta.host, firstImage))
      else if (firstImage?.['@id'])
        setIfEmpty(node, 'thumbnailUrl', find<ImageObject>(firstImage['@id'])?.url)
    }

    if (identity) {
      setIfEmpty(node, 'publisher', idReference(identity))
      setIfEmpty(node, 'author', idReference(identity))
    }

    if (webPage) {
      setIfEmpty(node, 'isPartOf', idReference(webPage))
      setIfEmpty(node, 'mainEntityOfPage', idReference(webPage))
      setIfEmpty(webPage, 'potentialAction', [
        {
          '@type': 'ReadAction',
          'target': [meta.url],
        },
      ])
      // clone the dates to the webpage
      setIfEmpty(webPage, 'dateModified', node.dateModified)
      setIfEmpty(webPage, 'datePublished', node.datePublished)
      // setIfEmpty(webPage, 'author', article.author)
    }
    return node
  },
})
