import type { Arrayable, Thing } from '../../types'
import { defineSchemaOrgResolver } from '../../core'
import { resolveDefaultType, resolveWithBase, setIfEmpty } from '../../utils'

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
  /**
   * Google requires this fixed value. Defaults to `Math Solver`.
   */
  'learningResourceType'?: 'Math Solver' | 'Math solver'
}

export interface MathSolver extends MathSolverSimple {}

export const mathSolverResolver = defineSchemaOrgResolver<MathSolver>({
  defaults: {
    '@type': ['MathSolver', 'LearningResource'],
  },
  inheritMeta: [
    'inLanguage',
    'url',
  ],
  idPrefix: ['url', '#math-solver'],
  resolve(node, { meta }) {
    // Google requires learningResourceType, a LearningResource property, and its examples type the node as both.
    resolveDefaultType(node, ['MathSolver', 'LearningResource'])
    setIfEmpty(node, 'learningResourceType', 'Math Solver')
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
