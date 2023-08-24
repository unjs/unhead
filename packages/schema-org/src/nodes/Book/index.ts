import { withBase } from 'ufo'
import type {
  Arrayable,
  Identity,
  NodeRelation,
  NodeRelations,
  OptionalSchemaOrgPrefix,
  ResolvableDate,
  Thing,
} from '../../types'
import {
  IdentityId,
  idReference, resolvableDateToDate, setIfEmpty,
} from '../../utils'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import type { ReadAction } from '../WebPage'

export interface BookSimple extends Thing {
  /**
   * The title of the book.
   */
  name: string
  /**
   * A description of the course. Display limit of 60 characters.
   */
  description?: string
  /**
   *  A reference to an Organization piece, representing brand associated with the Product.
   */
  author?: NodeRelation<Identity>
  /**
   * The URL on your website where the book is introduced or described.
   */
  url?: string
  /**
   * The URL of a reference page that identifies the work. For example, a Wikipedia, Wikidata, VIAF, or Library of Congress page for the book.
   */
  sameAs?: Arrayable<string>
  /**
   * The edition(s) of the work.
   */
  workExample: NodeRelations<BookEdition>
}

export interface Book extends BookSimple {}

type BookFormat = OptionalSchemaOrgPrefix<'AudiobookFormat'> | OptionalSchemaOrgPrefix<'EBook'> | OptionalSchemaOrgPrefix<'Hardcover'> | OptionalSchemaOrgPrefix<'Paperback'>

export interface BookEditionSimple extends Thing {
  /**
   * The title of the edition. Only use this when the title of the edition is different from the title of the work.
   */
  name?: string
  /**
   * The format of the edition.
   */
  bookFormat: BookFormat
  /**
   * The main language of the content in the edition. Use one of the two-letter codes from the list of ISO 639-1 alpha-2 codes.
   */
  inLanguage?: string
  /**
   * The ISBN-13 of the edition. If you have ISBN-10, convert it into ISBN-13.
   */
  isbn: string
  /**
   * The action to be triggered for users to purchase or download the book.
   */
  potentialAction?: Arrayable<ReadAction | any>
  /**
   * The author(s) of the edition.
   */
  author?: NodeRelations<Identity>
  /**
   * The edition information of the book. For example, 2nd Edition.
   */
  bookEdition?: string
  /**
   * The date of publication of the edition in YYYY-MM-DD or YYYY format. This can be either a specific date or only a specific year.
   */
  datePublished?: ResolvableDate
  /**
   * The external or other ID that unambiguously identifies this edition. Multiple identifiers are allowed. For more details, refer to PropertyValue (identifier).
   */
  identifier?: unknown
  /**
   * The URL of a reference web page that unambiguously indicates the edition. For example, a Wikipedia page for this specific edition. Don't reuse the sameAs of the Work.
   */
  sameAs?: Arrayable<string>
  /**
   * The URL on your website where the edition is introduced or described. It can be the same as workExample.target.urlTemplate.
   */
  url?: string
}

export interface BookEdition extends BookEditionSimple {}

export const bookEditionResolver = defineSchemaOrgResolver<BookEdition>({
  defaults: {
    '@type': 'Book',
  },
  inheritMeta: [
    'inLanguage',
  ],
  resolve(node, ctx) {
    if (node.bookFormat)
      node.bookFormat = withBase(node.bookFormat, 'https://schema.org/') as BookFormat
    if (node.datePublished)
      node.datePublished = resolvableDateToDate(node.datePublished)

    node.author = resolveRelation(node.author, ctx)
    return node
  },
  resolveRootNode(node, { find }) {
    const identity = find<Identity>(IdentityId)

    if (identity)
      setIfEmpty(node, 'provider', idReference(identity))

    return node
  },
})

export const PrimaryBookId = '#book'

export const bookResolver = defineSchemaOrgResolver<Book>({
  defaults: {
    '@type': 'Book',
  },
  inheritMeta: [
    'description',
    'url',
    { meta: 'title', key: 'name' },
  ],
  idPrefix: ['url', PrimaryBookId],
  resolve(node, ctx) {
    // provide a default sku
    node.workExample = resolveRelation(node.workExample, ctx, bookEditionResolver)

    node.author = resolveRelation(node.author, ctx)

    if (node.url)
      withBase(node.url, ctx.meta.host)
    return node
  },
  resolveRootNode(node, { find }) {
    const identity = find<Identity>(IdentityId)

    if (identity)
      setIfEmpty(node, 'author', idReference(identity))
    return node
  },
})
