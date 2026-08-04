---
title: MathSolver Schema
description: Add Google Math solver structured data with defineMathSolver(), including SolveMathAction URL templates and learning resource metadata.
---

## Schema.org MathSolver

- **Type**: `defineMathSolver(input?: MathSolver)`{lang="ts"}

  Describes a site that accepts math expressions and returns solutions.

## Useful Links

- [Math solver markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/math-solvers)
- [MathSolver - Schema.org](https://schema.org/MathSolver)

## Example

```ts
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
})
```

Google requires `potentialAction`, `url`, `usageInfo`, `potentialAction.target`, and the annotated `mathExpression-input` property. Add the `LearningResource` type and `learningResourceType: 'Math Solver'` when the page also represents a learning resource.

## Defaults and resolves

- `@type` includes `MathSolver`.
- `@id` defaults to `${canonicalUrl}#math-solver`.
- Relative `url`, `usageInfo`, and action targets resolve against the configured host.
- `inLanguage` inherits from Schema.org params.
