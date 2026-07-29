import type { DigitalSourceType, Identity, NodeRelation, NodeRelations, ResolvableDate, Thing } from '../../types'
import type { Comment } from '../Comment'
import type { ImageObject } from '../Image'
import type { VideoObject } from '../Video'
import type { Answer } from './Answer'
import { defineSchemaOrgResolver, resolveIdentityRelation, resolveRelation } from '../../core'
import {
  asArray,
  dedupeMerge,
  idReference,
  resolvableDateToIso,
} from '../../utils'
import { commentResolver } from '../Comment'
import { organizationResolver } from '../Organization'
import { personResolver } from '../Person'
import { videoResolver } from '../Video'
import { PrimaryWebPageId } from '../WebPage'
import { answerResolver } from './Answer'

/**
 * A specific question - e.g. from a user seeking answers online, or collected in a Frequently Asked Questions (FAQ) document.
 */
export interface QuestionSimple extends Thing {
  /**
   * The text content of the question.
   */
  name?: string
  /**
   * An answer object, with a text property which contains the answer to the question.
   */
  acceptedAnswer?: NodeRelations<Answer | string>
  /**
   * Answers that have not been accepted.
   */
  suggestedAnswer?: NodeRelations<Answer | string>
  /**
   * The language code for the question; e.g., en-GB.
   */
  inLanguage?: string
  /**
   * The number of answers provided for this question.
   */
  answerCount?: number
  /**
   * The date and time the question was created.
   */
  dateCreated?: ResolvableDate
  /**
   * The author of the question.
   */
  author?: NodeRelation<Identity>
  comment?: NodeRelations<Comment>
  commentCount?: number
  dateModified?: ResolvableDate
  datePublished?: ResolvableDate
  digitalSourceType?: DigitalSourceType
  image?: NodeRelations<ImageObject | string>
  text?: string
  upvoteCount?: number
  video?: NodeRelations<VideoObject>
  /**
   * Alias for `name`
   */
  question?: string
  /**
   * Alias for `acceptedAnswer`
   */
  answer?: string
}
export interface Question extends QuestionSimple {}

/**
 * Describes a Question. Most commonly used in FAQPage or QAPage content.
 */
export const questionResolver = defineSchemaOrgResolver<Question>({
  defaults: {
    '@type': 'Question',
  },
  inheritMeta: [
    'inLanguage',
  ],
  idPrefix: 'url',
  resolve(question, ctx) {
    if (question.question) {
      question.name = question.question
      delete question.question
    }
    if (question.answer) {
      question.acceptedAnswer = question.answer
      delete question.answer
    }
    // resolve string answer to Answer
    question.acceptedAnswer = resolveRelation(question.acceptedAnswer, ctx, answerResolver)
    question.suggestedAnswer = resolveRelation(question.suggestedAnswer, ctx, answerResolver)
    question.author = resolveIdentityRelation(question.author, ctx, {
      organization: organizationResolver,
      person: personResolver,
    }, {
      root: true,
    }) as NodeRelation<Identity>
    question.comment = resolveRelation(question.comment, ctx, commentResolver)
    question.dateCreated = resolvableDateToIso(question.dateCreated)
    question.dateModified = resolvableDateToIso(question.dateModified)
    question.datePublished = resolvableDateToIso(question.datePublished)
    question.video = resolveRelation(question.video, ctx, videoResolver)
    return question
  },
  resolveRootNode(question, { find }) {
    const webPage = find(PrimaryWebPageId)

    // merge in nodes to the FAQPage
    if (webPage && (asArray(webPage['@type']).includes('FAQPage') || asArray(webPage['@type']).includes('QAPage')))
      dedupeMerge(webPage, 'mainEntity', idReference(question))
  },
})
