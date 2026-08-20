import { describe, expect, it } from 'vitest'
import { defineMathSolver, useSchemaOrg } from '../../'
import { injectSchemaOrg, useSetup } from '../../../test'

describe('defineMathSolver', () => {
  it('resolves action and policy URLs', async () => {
    await useSetup(async (head) => {
      useSchemaOrg(head, [
        defineMathSolver({
          '@type': ['MathSolver', 'LearningResource'],
          'learningResourceType': 'Math Solver',
          'potentialAction': {
            '@type': 'SolveMathAction',
            'target': '/solve?q={math_expression_string}',
            'mathExpression-input': 'required name=math_expression_string',
            'eduQuestionType': 'Polynomial Equation',
          },
          'url': '/',
          'usageInfo': '/privacy',
        }),
      ])

      expect(await injectSchemaOrg(head)).toMatchInlineSnapshot(`
        [
          {
            "@id": "https://example.com/#math-solver",
            "@type": [
              "MathSolver",
              "LearningResource",
            ],
            "inLanguage": "en-AU",
            "learningResourceType": "Math Solver",
            "potentialAction": [
              {
                "@type": "SolveMathAction",
                "eduQuestionType": "Polynomial Equation",
                "mathExpression-input": "required name=math_expression_string",
                "target": "https://example.com/solve?q={math_expression_string}",
              },
            ],
            "url": "https://example.com",
            "usageInfo": "https://example.com/privacy",
          },
        ]
      `)
    })
  })
})
