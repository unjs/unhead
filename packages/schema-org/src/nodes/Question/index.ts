import type { NodeRelation, Thing } from '../../types'
import {
  asArray,
  dedupeMerge,
  idReference,
} from '../../utils'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import type { WebPage } from '../WebPage'
import { PrimaryWebPageId } from '../WebPage'
import type { Answer } from './Answer'
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
    if (question.question)
      question.name = question.question
    if (question.answer)
      question.acceptedAnswer = question.answer
    // resolve string answer to Answer
    question.acceptedAnswer = resolveRelation(question.acceptedAnswer, ctx, answerResolver)
    return question
  },
  resolveRootNode(question, { find }) {
    const webPage = find<WebPage>(PrimaryWebPageId)

    // merge in nodes to the FAQPage
    if (webPage && asArray(webPage['@type']).includes('FAQPage'))
      dedupeMerge(webPage, 'mainEntity', idReference(question))
  },
})
