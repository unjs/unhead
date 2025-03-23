---
title: FAQ
description: Learn how to implement Schema.org FAQ markup to improve your search appearance.
---

Creating a FAQ page on your site is a great way to help your users understand your website.

Providing Schema.org for these Questions and Answers can help improve your organic reach by allowing Google to optimise
your faq pages search appearance.

## Useful Links

- [defineQuestion](/docs/schema-org/api/schema/question)
- [FAQ Page | Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/faqpage)
- [Question Schema | Yoast](https://developer.yoast.com/features/schema/pieces/question)

## Marking up FAQs

[defineQuestion](/docs/schema-org/api/schema/question) creates Question Schema whilst handling relations for you.

Note: When using a page with the path `/faq`, the page type will be automatically set for you.

Tips:

- The answer may contain HTML content such as links and lists.

```ts
import { defineQuestion, defineWebPage, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineWebPage({
    '@type': 'FAQPage',
  }),
  defineQuestion({
    name: 'How long is a piece of string?',
    acceptedAnswer: 'The length of a piece of string is the number of characters in the string.',
  }),
  defineQuestion({
    name: 'How big is a giraffe?',
    acceptedAnswer: 'A giraffe is 12 feet tall',
  }),
])
```

## HTML Structured Content

For the best user experience, it's good to structure your FAQ content in a way that matches your schema markup:

```html
<div>
  <h1>Frequently Asked Questions</h1>

  <div>
    <h2>How long is a piece of string?</h2>
    <div>The length of a piece of string is the number of characters in the string.</div>
  </div>

  <div>
    <h2>How big is a giraffe?</h2>
    <div>A giraffe is 12 feet tall</div>
  </div>

  <div>
    <h2>What is quantum mechanics?</h2>
    <div>
      <p>Quantum mechanics is the study of the nature of matter.</p>
      <p>It is the study of the nature of the interaction between particles and the nature of the universe.</p>
      <p>Particles are the smallest particles in the universe.</p>
      <p>The universe is made up of particles.</p>
      <p>Particles are made up of matter.</p>
      <p>Matter is made up of energy.</p>
    </div>
  </div>
</div>
```

## Rich HTML Content in Answers

You can include HTML content in your answers to provide a richer experience:

```ts
import { defineQuestion, defineWebPage, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineWebPage({
    '@type': 'FAQPage',
  }),
  defineQuestion({
    name: 'What is quantum mechanics?',
    acceptedAnswer: `
      <p>Quantum mechanics is the study of the nature of matter.</p>
      <p>It is the study of the nature of the interaction between particles and the nature of the universe.</p>
      <p>Particles are the smallest particles in the universe.</p>
      <p>The universe is made up of particles.</p>
      <p>Particles are made up of matter.</p>
      <p>Matter is made up of energy.</p>
    `,
  }),
])
```
