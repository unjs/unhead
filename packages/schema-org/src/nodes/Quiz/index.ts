import type { NodeRelation, NodeRelations, Thing } from '../../types'
import type { Question } from '../Question'
import type { Answer } from '../Question/Answer'
import { defineSchemaOrgResolver, resolveRelation } from '../../core'
import { idReference, setIfEmpty } from '../../utils'
import { questionResolver } from '../Question'
import { PrimaryWebPageId } from '../WebPage'

export interface AlignmentObject extends Thing {
  '@type'?: 'AlignmentObject'
  'alignmentType': 'educationalSubject' | 'educationalLevel'
  'targetName': string
}

export interface EducationQuestion extends Question {
  acceptedAnswer: NodeRelation<Answer | string>
  eduQuestionType: 'Flashcard'
  text: string
}

export interface QuizSimple extends Thing {
  '@type'?: 'Quiz'
  'hasPart': NodeRelations<EducationQuestion>
  'about'?: NodeRelations<Thing>
  'educationalAlignment'?: NodeRelations<AlignmentObject>
}

export interface Quiz extends QuizSimple {}

const alignmentObjectResolver = defineSchemaOrgResolver<AlignmentObject>({
  defaults: {
    '@type': 'AlignmentObject',
  },
})

export const quizResolver = defineSchemaOrgResolver<Quiz>({
  defaults: {
    '@type': 'Quiz',
  },
  idPrefix: ['url', '#quiz'],
  resolve(node, ctx) {
    node.hasPart = resolveRelation(node.hasPart, ctx, questionResolver) as NodeRelations<EducationQuestion>
    node.educationalAlignment = resolveRelation(node.educationalAlignment, ctx, alignmentObjectResolver)
    return node
  },
  resolveRootNode(node, { find }) {
    const webPage = find(PrimaryWebPageId)
    if (webPage)
      setIfEmpty(node, 'mainEntityOfPage', idReference(webPage))
  },
})
