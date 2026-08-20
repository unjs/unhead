---
title: Quiz Schema
description: Add Google Education Q&A structured data with defineQuiz(), including flashcard questions, answers, subjects, and grade alignments.
---

## Schema.org Quiz

- **Type**: `defineQuiz(input?: Quiz)`{lang="ts"}

  Describes a set of educational flashcards for Google's Education Q&A feature.

## Useful Links

- [Education Q&A markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/education-qa)
- [Quiz - Schema.org](https://schema.org/Quiz)

## Example

```ts
defineQuiz({
  about: {
    '@type': 'Thing',
    'name': 'Cell transport',
  },
  educationalAlignment: {
    alignmentType: 'educationalSubject',
    targetName: 'Biology',
  },
  hasPart: {
    text: 'What protects the contents of a cell?',
    eduQuestionType: 'Flashcard',
    acceptedAnswer: 'Cell membrane',
  },
})
```

Each `hasPart` question requires `text`, `eduQuestionType: 'Flashcard'`, and one `acceptedAnswer`.

## Defaults and resolves

- `@type` defaults to `Quiz`.
- `@id` defaults to `${canonicalUrl}#quiz`.
- Questions resolve with `Question` and `Answer` defaults.
- Educational alignments resolve to `AlignmentObject`.
- A root Quiz references the primary WebPage through `mainEntityOfPage`.
