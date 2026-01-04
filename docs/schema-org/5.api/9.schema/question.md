## Schema.org Question

- **Type**: `defineQuestion(input?: Question)`{lang="ts"}

  Describes an individual question. Most commonly used for creating an FAQ type page.

## Useful Links

- [Schema.org Question](https://schema.org/Question)
- [Recipe: FAQ](/docs/schema-org/guides/recipes/faq)

## Required properties

- **name** `string`

  The text content of the question.

- **acceptedAnswer** `string|Answer`

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
- **@id**: `${canonicalUrl}#/schema/question/${questionId}`
- **inLanguage**: `options.defaultLanguage` _(see: [user Config](/docs/schema-org/guides/core-concepts/params))_

## Resolves

See [Global Resolves](/docs/schema-org/guides/get-started/overview#site-page-level-config) for full context.

- will convert a string answer to an [Answer](https://schema.org/Answer) object.
- `@id` is resolved using a hash of the question name if not provided

## Relation Transforms

[WebPage](/docs/schema-org/api/schema/webpage)

- Each question will append an entry on to `mainEntity`

## Types

```ts
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
  dateCreated?: string
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
export interface Answer extends Optional<Thing, '@id'> {
  text: string
}
```

## Related Schemas

- [Person](/docs/schema-org/api/schema/person) - Question author
- [Article](/docs/schema-org/api/schema/article) - Related article
