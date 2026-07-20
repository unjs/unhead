---
title: Schema.org for How-To Content
description: 'Add HowTo structured data with defineHowTo(), including steps, images, supplies, tools, and time estimates.'
navigation:
  title: How To
---

HowTo structured data describes the steps, supplies, tools, and timing of instructional content. [Google deprecated How-to rich results in September 2023](https://developers.google.com/search/blog/2023/08/howto-faq-changes), but the markup remains part of Schema.org.

## Useful Links

- [defineHowTo](/docs/schema-org/api/schema/how-to)
- [HowTo - Schema.org](https://schema.org/HowTo)
- [How-to rich result deprecation | Google Search Central](https://developers.google.com/search/blog/2023/08/howto-faq-changes)

## Marking up a How-To Guide

The [defineHowTo](/docs/schema-org/api/schema/how-to) helper creates a HowTo node and resolves its steps.

Some fields may already be inferred. See [Schema.org Params](/docs/schema-org/guides/core-concepts/params).

```ts
import { defineHowTo, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineHowTo({
    name: 'How to Build a Desk',
    description: 'A step-by-step guide to building a home office desk.',
    image: '/images/desk-building.jpg',
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: '100'
    },
    supply: [
      'Wood panels',
      'Screws',
      'Hammer',
      'Nails'
    ],
    tool: [
      'Screwdriver',
      'Power drill',
      'Tape measure'
    ],
    step: [
      {
        name: 'Gather materials',
        text: 'Collect all necessary supplies and tools.',
        image: '/images/desk-materials.jpg',
        url: '/how-to-build-desk/materials'
      },
      {
        name: 'Cut wood panels',
        text: 'Cut the wood panels to the proper dimensions.',
        image: '/images/cutting-panels.jpg',
        url: '/how-to-build-desk/cutting'
      },
      {
        name: 'Assemble desk frame',
        text: 'Connect the panels to form the desk frame.',
        image: '/images/desk-frame.jpg',
        url: '/how-to-build-desk/assembly'
      },
      {
        name: 'Attach desk top',
        text: 'Secure the desk top to the frame.',
        image: '/images/desk-top.jpg',
        url: '/how-to-build-desk/finishing'
      }
    ]
  })
])
```

## Steps with HowToStep

Use `HowToStep` when a step contains several directions:

```ts
import { defineHowTo, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineHowTo({
    name: 'How to Change a Flat Tire',
    description: 'Instructions for changing a flat tire safely.',
    step: [
      {
        '@type': 'HowToStep',
        'name': 'Prepare your vehicle',
        'itemListElement': [
          {
            '@type': 'HowToDirection',
            'text': 'Park your car on flat, stable ground'
          },
          {
            '@type': 'HowToDirection',
            'text': 'Apply the parking brake'
          },
          {
            '@type': 'HowToDirection',
            'text': 'Turn on hazard lights'
          }
        ]
      },
      {
        '@type': 'HowToStep',
        'name': 'Remove the flat tire',
        'itemListElement': [
          {
            '@type': 'HowToDirection',
            'text': 'Loosen lug nuts with a lug wrench'
          },
          {
            '@type': 'HowToDirection',
            'text': 'Use a jack to lift the vehicle'
          },
          {
            '@type': 'HowToDirection',
            'text': 'Remove the lug nuts completely'
          },
          {
            '@type': 'HowToDirection',
            'text': 'Remove the flat tire'
          }
        ]
      }
    ]
  })
])
```

## Adding Time Information

For How-To guides, you can specify the time spent performing the instructions and the total time required:

```ts
import { defineHowTo, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineHowTo({
    name: 'How to Make Pancakes',
    performTime: 'PT20M', // 20 minutes performing the instructions
    totalTime: 'PT30M', // 30 minutes in ISO 8601 duration format
    step: [
      {
        name: 'Mix ingredients',
        text: 'Combine flour, milk, eggs, and sugar in a bowl.'
      },
      {
        name: 'Cook pancakes',
        text: 'Pour batter onto hot griddle and flip when bubbles form.'
      }
    ]
  })
])
```

::tip
For time durations, use the [W3C duration format](https://www.w3.org/TR/xmlschema11-2/#duration). For example, "PT30M" represents 30 minutes, "PT2H30M" represents 2 hours and 30 minutes.
::

## Structured How-To Content

Keep the visible instructions consistent with the schema. For example:

```html
<div>
  <h1>How to Build a Desk</h1>
  <p>A step-by-step guide to building a home office desk.</p>

  <div>
    <h2>What You'll Need</h2>
    <ul>
      <li>Wood panels</li>
      <li>Screws</li>
      <li>Hammer</li>
      <li>Nails</li>
    </ul>

    <h2>Tools</h2>
    <ul>
      <li>Screwdriver</li>
      <li>Power drill</li>
      <li>Tape measure</li>
    </ul>
  </div>

  <div>
    <h2>Steps</h2>

    <div>
      <h3>1. Gather materials</h3>
      <img src="/images/desk-materials.jpg" alt="Materials for desk building" />
      <p>Collect all necessary supplies and tools.</p>
    </div>

    <div>
      <h3>2. Cut wood panels</h3>
      <img src="/images/cutting-panels.jpg" alt="Cutting wood panels" />
      <p>Cut the wood panels to the proper dimensions.</p>
    </div>

    <!-- Additional steps... -->
  </div>
</div>
```

## Best Practices

- Match every marked-up step, tool, supply, and duration to the visible instructions.
- Add step images and time estimates when the page provides them.
- Check the rendered markup with the [Schema.org Validator](https://validator.schema.org/). Google's Rich Results Test no longer supports HowTo.

## Related Recipes

- [Setting Up Your Identity](/docs/schema-org/guides/recipes/identity): Define your organization/person
- [FAQ Page](/docs/schema-org/guides/recipes/faq): Add FAQ structured data
- [Blog Posts](/docs/schema-org/guides/recipes/blog): Article structured data
