import { defineSchemaOrgResolver } from '../../../core'
import type { Thing } from '../../../types'

/**
 * An answer offered to a question; perhaps correct, perhaps opinionated or wrong.
 */
export interface AnswerSimple extends Thing {
  text: string
}

export interface Answer extends AnswerSimple {}

export const answerResolver = defineSchemaOrgResolver<Answer>({
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
})
