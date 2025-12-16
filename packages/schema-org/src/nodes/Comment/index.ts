import type { IdReference, NodeRelation, Thing } from '../../types'
import type { Article } from '../Article'
import type { Person } from '../Person'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import {
  idReference,
  setIfEmpty,
} from '../../utils'
import { PrimaryArticleId } from '../Article'
import { personResolver } from '../Person'

export interface CommentSimple extends Thing {
  /**
   * The textual content of the comment, stripping HTML tags.
   */
  text: string
  /**
   *  A reference by ID to the parent Article (or WebPage, when no Article is present).
   */
  about?: IdReference
  /**
   * A reference by ID to the Person who wrote the comment.
   */
  author: NodeRelation<Person>
  /**
   * The date and time the comment was created.
   */
  dateCreated?: string
  /**
   * The date and time the comment was last modified.
   */
  dateModified?: string
  /**
   * The number of upvotes the comment has received.
   */
  upvoteCount?: number
  /**
   * The number of downvotes the comment has received.
   */
  downvoteCount?: number
}

export interface Comment extends CommentSimple {}

/**
 * Describes a comment. Usually in the context of an Article or a WebPage.
 */
export const commentResolver = defineSchemaOrgResolver<Comment>({
  defaults: {
    '@type': 'Comment',
  },
  idPrefix: 'url',
  resolve(node, ctx) {
    node.author = resolveRelation(node.author, ctx, personResolver, {
      root: true,
    })
    return node
  },
  resolveRootNode(node, { find }) {
    const article = find<Article>(PrimaryArticleId)
    if (article)
      setIfEmpty(node, 'about', idReference(article))
  },
})
