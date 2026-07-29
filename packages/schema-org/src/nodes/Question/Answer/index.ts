import type { DigitalSourceType, Identity, NodeRelation, NodeRelations, ResolvableDate, Thing } from '../../../types'
import type { Comment } from '../../Comment'
import type { ImageObject } from '../../Image'
import type { VideoObject } from '../../Video'
import { defineSchemaOrgResolver, resolveIdentityRelation, resolveRelation } from '../../../core'
import { resolvableDateToIso, resolveWithBase } from '../../../utils'
import { commentResolver } from '../../Comment'
import { organizationResolver } from '../../Organization'
import { personResolver } from '../../Person'
import { videoResolver } from '../../Video'

/**
 * An answer offered to a question; perhaps correct, perhaps opinionated or wrong.
 */
export interface AnswerSimple extends Thing {
  text: string
  author?: NodeRelation<Identity>
  comment?: NodeRelations<Comment>
  commentCount?: number
  dateModified?: ResolvableDate
  datePublished?: ResolvableDate
  digitalSourceType?: DigitalSourceType
  image?: NodeRelations<ImageObject | string>
  upvoteCount?: number
  url?: string
  video?: NodeRelations<VideoObject | string>
}

export interface Answer extends AnswerSimple {}

export const answerResolver = defineSchemaOrgResolver<Answer, Answer | string>({
  cast(node) {
    if (typeof node === 'string') {
      return {
        text: node,
      }
    }
    return node
  },
  defaults: {
    '@type': 'Answer',
  },
  resolve(node, ctx) {
    node.author = resolveIdentityRelation(node.author, ctx, {
      organization: organizationResolver,
      person: personResolver,
    }, {
      root: true,
    }) as NodeRelation<Identity>
    node.comment = resolveRelation(node.comment, ctx, commentResolver)
    node.dateModified = resolvableDateToIso(node.dateModified)
    node.datePublished = resolvableDateToIso(node.datePublished)
    node.video = resolveRelation(node.video, ctx, videoResolver)
    if (node.url)
      node.url = resolveWithBase(ctx.meta.host, node.url)
    return node
  },
})
