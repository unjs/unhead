---
title: FAQ
description: 'Add FAQPage structured data with defineQuestion() and connect each Question to the page mainEntity graph.'
---

Use `defineQuestion()` with `defineWebPage({ '@type': 'FAQPage' })` to mark up FAQ content and connect each Question to the page's `mainEntity` property.

::note
[Google stopped showing FAQ rich results on May 7, 2026](https://developers.google.com/search/updates#removing-faq-rich-result). FAQPage markup remains valid Schema.org structured data, but it no longer creates a Google Search rich result.
::

## Useful Links

- [defineQuestion](/docs/schema-org/api/schema/question)
- [FAQPage - Schema.org](https://schema.org/FAQPage)
- [Question - Schema.org](https://schema.org/Question)
- [FAQ rich result removal | Google Search Central](https://developers.google.com/search/updates#removing-faq-rich-result)

## How do I mark up FAQs?

[defineQuestion](/docs/schema-org/api/schema/question) creates a Question node and resolves a string answer to an Answer object.

When the configured page path ends in `/faq`, `defineWebPage()` infers the `FAQPage` subtype.

Tips:

- The answer may contain HTML content such as links and lists.

```ts
import { defineQuestion, defineWebPage, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineWebPage({
    '@type': 'FAQPage',
  }),
  defineQuestion({
    name: 'How long does delivery take?',
    acceptedAnswer: 'Most orders arrive within three to five business days.',
  }),
  defineQuestion({
    name: 'Can I return an item?',
    acceptedAnswer: 'You can return an unused item within 30 days of delivery.',
  }),
])
```

## How should I structure FAQ content in HTML?

Keep the visible questions and answers consistent with the schema markup:

```html
<div>
  <h1>Frequently Asked Questions</h1>

  <div>
    <h2>How long does delivery take?</h2>
    <div>Most orders arrive within three to five business days.</div>
  </div>

  <div>
    <h2>Can I return an item?</h2>
    <div>You can return an unused item within 30 days of delivery.</div>
  </div>
</div>
```

## Can I use HTML in FAQ answers?

Answer strings may contain HTML, including paragraphs, links, and lists:

```ts
import { defineQuestion, defineWebPage, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineWebPage({
    '@type': 'FAQPage',
  }),
  defineQuestion({
    name: 'How do I start a return?',
    acceptedAnswer: `
      <p>Open the order in your account and select “Start a return.”</p>
      <p><a href="/returns">Read the return policy</a> before sending the item.</p>
    `,
  }),
])
```

## Abridged JSON-LD Output

With a host of `https://example.com`, a path of `/faq`, and a page title of `FAQ`, the output for the first question looks like this:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["WebPage", "FAQPage"],
      "@id": "https://example.com/faq#webpage",
      "name": "FAQ",
      "url": "https://example.com/faq",
      "mainEntity": [
        { "@id": "https://example.com/faq#/schema/question/1" }
      ]
    },
    {
      "@id": "https://example.com/faq#/schema/question/1",
      "@type": "Question",
      "name": "How long does delivery take?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Most orders arrive within three to five business days."
      }
    }
  ]
}
```

## Common Issues

### FAQ not showing as a rich result

Google no longer shows FAQ rich results. This is expected even when the markup is valid.

### Questions not appearing

Include both `defineWebPage({ '@type': 'FAQPage' })` and `defineQuestion()` to have Unhead add Question references to the page's `mainEntity` property.

### Is HTML in answers stripped?

Unhead preserves the answer string and escapes it safely inside the JSON-LD script. It does not sanitize HTML supplied in the answer.

## Related Recipes

- [Setting Up Your Identity](/docs/schema-org/guides/recipes/identity): Define your organization/person
- [How-To Guide](/docs/schema-org/guides/recipes/how-to): Step-by-step instructions
