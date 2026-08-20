import type { DigitalSourceType, Identity, IdReference, NodeRelation, NodeRelations, ResolvableDate, Thing } from '../../types'
import type { ImageObject } from '../Image'
import type { VideoObject } from '../Video'
import { defineSchemaOrgResolver, resolveIdentityRelation, resolveRelation } from '../../core'
import {
  idReference,
  resolvableDateToIso,
  setIfEmpty,
} from '../../utils'
import { PrimaryArticleId } from '../Article'
import { organizationResolver } from '../Organization'
import { personResolver } from '../Person'
import { videoResolver } from '../Video'

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
  author: NodeRelation<Identity>
  /**
   * The date and time the comment was created.
   */
  dateCreated?: ResolvableDate
  /**
   * The date and time the comment was last modified.
   */
  dateModified?: ResolvableDate
  /**
   * The date and time the comment was published.
   */
  datePublished?: ResolvableDate
  /**
   * Replies to this comment.
   */
  comment?: NodeRelations<Comment>
  /**
   * The number of replies.
   */
  commentCount?: number
  /**
   * The source type when content was generated or edited algorithmically.
   */
  digitalSourceType?: DigitalSourceType
  /**
   * Images attached to the comment.
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * Videos attached to the comment.
   */
  video?: NodeRelations<VideoObject | string>
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
    node.author = resolveIdentityRelation(node.author, ctx, {
      organization: organizationResolver,
      person: personResolver,
    }, {
      root: true,
    }) as NodeRelation<Identity>
    node.comment = resolveRelation(node.comment, ctx, commentResolver)
    node.dateCreated = resolvableDateToIso(node.dateCreated)
    node.dateModified = resolvableDateToIso(node.dateModified)
    node.datePublished = resolvableDateToIso(node.datePublished)
    node.video = resolveRelation(node.video, ctx, videoResolver)
    return node
  },
  resolveRootNode(node, { find }) {
    const article = find(PrimaryArticleId)
    if (article)
      setIfEmpty(node, 'about', idReference(article))
  },
})
