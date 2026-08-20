import type { Arrayable, Thing } from '../../types'
import { defineSchemaOrgResolver } from '../../core'
import { resolveDefaultType, resolveWithBase } from '../../utils'

export interface SolveMathAction extends Thing {
  '@type'?: 'SolveMathAction'
  'target': string
  'mathExpression-input': 'required name=math_expression_string'
  'eduQuestionType'?: Arrayable<string>
}

export interface MathSolverSimple extends Thing {
  '@type'?: Arrayable<'MathSolver' | 'LearningResource'>
  'potentialAction': Arrayable<SolveMathAction>
  'url': string
  'usageInfo': string
  'assesses'?: Arrayable<string>
  'inLanguage'?: Arrayable<string>
  'learningResourceType'?: 'Math Solver'
}

export interface MathSolver extends MathSolverSimple {}

export const mathSolverResolver = defineSchemaOrgResolver<MathSolver>({
  defaults: {
    '@type': 'MathSolver',
  },
  inheritMeta: [
    'inLanguage',
    'url',
  ],
  idPrefix: ['url', '#math-solver'],
  resolve(node, { meta }) {
    resolveDefaultType(node, 'MathSolver')
    node.url = resolveWithBase(meta.host, node.url)
    node.usageInfo = resolveWithBase(meta.host, node.usageInfo)
    const actions = Array.isArray(node.potentialAction) ? node.potentialAction : [node.potentialAction]
    node.potentialAction = actions.map(action => ({
      '@type': 'SolveMathAction',
      ...action,
      'target': resolveWithBase(meta.host, action.target),
    }))
    return node
  },
})
