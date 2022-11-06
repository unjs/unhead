---
title: FAQ
---

# Setting up Schema.org for a FAQ in Vue

Creating a FAQ page on your site is a great way to help your users understand your website. 

Providing Schema.org for these Questions and Answers can help improve your organic reach by allowing Google to optimise
your faq pages search appearance.

## Useful Links

- [defineQuestion](/schema/question.md)
- [FAQ Page | Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/faqpage)
- [Question Schema | Yoast](https://developer.yoast.com/features/schema/pieces/question)

## Marking up FAQs

The [defineQuestion](/schema/question) function and [SchemaOrgQuestion](/guide/guides/components) component are provided
to create Question Schema whilst handling relations for you.

Note: When using a page with the path `/faq`, the page type will be automatically set for you. 

Tips:
- The answer may contain HTML content such as links and lists.

::code-group

```ts [Composition API]
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

```vue [Component API - Props]
<template>
  <SchemaOrgWebpage type="FAQPage" />
  <SchemaOrgQuestion 
    name="How long is a piece of string?"
    accepted-answer="The length of a piece of string is the number of characters in the string."
  />
  <SchemaOrgQuestion 
    name="How big is a giraffe?"
    accepted-answer="A giraffe is 12 feet tall"
  />
</template>
```

```vue [Component API - Scoped Slots]
<template>
  <SchemaOrgQuestion>
    <template #name>
      What is quantum mechanics?
    </template>
    <template #acceptedAnswer>
      <p>Quantum mechanics is the study of the nature of matter.</p>
      <p>It is the study of the nature of the interaction between particles and the nature of the universe.</p>
      <p>Particles are the smallest particles in the universe.</p>
      <p>The universe is made up of particles.</p>
      <p>Particles are made up of matter.</p>
      <p>Matter is made up of energy.</p>
      <p>Energy is made up of heat.</p>
      <p>Heat is made up of light.</p>
      <p>Light is made up of sound.</p>
      <p>Sound is made up of colour.</p>
      <p>Colour is made up of light.</p>
      <p>Light is made up of light.</p>
    </template>
  </SchemaOrgQuestion>
</template>
```
::
