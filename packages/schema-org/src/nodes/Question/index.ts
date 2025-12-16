import type { NodeRelation, ResolvableDate, Thing } from '../../types'
import type { WebPage } from '../WebPage'
import type { Answer } from './Answer'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import {
  asArray,
  dedupeMerge,
  idReference,
  resolvableDateToIso,
} from '../../utils'
import { PrimaryWebPageId } from '../WebPage'
import { answerResolver } from './Answer'

/**
 * A specific question - e.g. from a user seeking answers online, or collected in a Frequently Asked Questions (FAQ) document.
 */
export interface QuestionSimple extends Thing {
  /**
   * The text content of the question.
   */
  name: string
  /**
   * An answer object, with a text property which contains the answer to the question.
   */
  acceptedAnswer: NodeRelation<Answer | string>
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
    question.dateCreated = resolvableDateToIso(question.dateCreated)
    return question
  },
  resolveRootNode(question, { find }) {
    const webPage = find<WebPage>(PrimaryWebPageId)

    // merge in nodes to the FAQPage
    if (webPage && asArray(webPage['@type']).includes('FAQPage'))
      dedupeMerge(webPage, 'mainEntity', idReference(question))
  },
})
