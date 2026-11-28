---
title: Question Schema
description: Use defineQuestion() to add Question and Answer structured data and connect QAPage or FAQPage mainEntity references.
---

## Schema.org Question

- **Type**: `defineQuestion<T extends Record<string, any>>(input?: Question & T)`{lang="ts"}

  Describes an individual question on a `QAPage` or an `FAQPage`.

::note
Google stopped showing FAQ rich results on May 7, 2026. `FAQPage` markup stays valid Schema.org. Google still uses `Question` for [Q&A pages](https://developers.google.com/search/docs/appearance/structured-data/qapage) and [Education Q&A](/docs/schema-org/api/schema/quiz). See the [FAQ recipe](/docs/schema-org/guides/recipes/faq) for details.
::

## Useful Links

- [Schema.org Question](https://schema.org/Question)
- [QAPage - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/qapage)
- [Recipe: FAQ](/docs/schema-org/guides/recipes/faq)

## Question and answer properties

- **name** `string` or **question** `string`

  The text content of the question.

- **acceptedAnswer** `string | Answer` or **answer** `string`

  The text content of the answer.

## Examples

### Minimal

```ts
defineQuestion({
  name: 'What is the meaning of life?',
  acceptedAnswer: '42',
})
```

## Defaults

- **@type**: `Question`
- **@id**: `${canonicalUrl}#/schema/question/{n}`
- **inLanguage**: `inLanguage` from resolved page metadata _(see: [Schema.org Params](/docs/schema-org/guides/core-concepts/params))_

## Resolves

See [Global Resolves](/docs/schema-org/guides/get-started/overview#how-does-schemaorg-get-page-data) for full context.

- converts the `question` alias to `name` and the `answer` alias to `acceptedAnswer`
- converts a string answer to an [Answer](https://schema.org/Answer) object
- assigns numbered IDs in registration order when `@id` is not provided
- serializes `dateCreated` Date objects as ISO 8601 strings

## Relation Transforms

[WebPage](/docs/schema-org/api/schema/webpage)

- Each question appends an entry to `mainEntity` when the WebPage includes the `FAQPage` or `QAPage` type

## Types

```ts
/**
 * A specific question, e.g., from a user seeking answers online or collected in a Frequently Asked Questions (FAQ) document.
 */
export interface QuestionSimple extends Thing {
  /**
   * The text content of the question.
   */
  name?: string
  /**
   * An answer object, with a text property which contains the answer to the question.
   */
  acceptedAnswer?: NodeRelation<Answer | string>
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

/**
 * An answer offered to a question; perhaps correct, perhaps opinionated or wrong.
 */
export interface AnswerSimple extends Thing {
  text: string
}

export interface Answer extends AnswerSimple {}
```

## Related Schemas

- [Person](/docs/schema-org/api/schema/person): Question author
- [Article](/docs/schema-org/api/schema/article): Related article
