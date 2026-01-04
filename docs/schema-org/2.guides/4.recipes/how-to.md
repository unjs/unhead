---
title: Schema.org for How-To Content
description: Learn how to implement Schema.org for How-To content to improve your search appearance.
navigation:
  title: How To
---

Creating How-To content is an excellent way to provide valuable instructions to your users. With Schema.org markup, you can help search engines better understand your content structure and potentially get rich results in search.

## Useful Links

- [defineHowTo](/docs/schema-org/api/schema/how-to)
- [HowTo | Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/how-to)
- [HowTo Schema | Yoast](https://developer.yoast.com/features/schema/pieces/howto)

## Marking up a How-To Guide

The [defineHowTo](/docs/schema-org/api/schema/how-to) function creates HowTo Schema whilst handling relations for you.

Note that some fields may already be inferred, see [Schema.org Params](/docs/schema-org/guides/core-concepts/params)

```ts
import { defineHowTo, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineHowTo({
    name: 'How to Build a Desk',
    description: 'A step-by-step guide to building a home office desk.',
    image: '/images/desk-building.jpg',
    estimatedCost: {
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

For more complex How-To guides, you can define detailed steps using the HowToStep type.

```ts
import { defineHowTo, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineHowTo({
    name: 'How to Change a Flat Tire',
    description: 'A comprehensive guide to safely changing a flat tire.',
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

For How-To guides, you can specify how long each step takes or the total time required:

```ts
import { defineHowTo, useSchemaOrg } from '@unhead/schema-org/@framework'

useSchemaOrg([
  defineHowTo({
    name: 'How to Make Pancakes',
    totalTime: 'PT30M', // 30 minutes in ISO 8601 duration format
    step: [
      {
        name: 'Mix ingredients',
        text: 'Combine flour, milk, eggs, and sugar in a bowl.',
        performTime: 'PT5M' // 5 minutes
      },
      {
        name: 'Cook pancakes',
        text: 'Pour batter onto hot griddle and flip when bubbles form.',
        performTime: 'PT15M' // 15 minutes
      }
    ]
  })
])
```

::tip
For time durations, use [ISO 8601 duration format](https://en.wikipedia.org/wiki/ISO_8601#Durations). For example, "PT30M" represents 30 minutes, "PT2H30M" represents 2 hours and 30 minutes.
::

## Structured How-To Content

For the best user experience, your HTML structure should match your schema. Here's an example of how you might structure your How-To content:

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

1. **Match content to schema**: Ensure your visible page content matches what's in your schema markup.
2. **Complete information**: Include all relevant details like tools, supplies, and clear steps.
3. **Add images**: Where possible, include images for each step to enhance understanding.
4. **Be specific**: Provide clear, actionable instructions in each step.
5. **Include timing**: Add time estimates for each step when applicable.
6. **Test in Google's Rich Results Test**: Validate your markup using [Google's Rich Results Test](https://search.google.com/test/rich-results).

## Related Recipes

- [Setting Up Your Identity](/docs/schema-org/guides/recipes/identity) - Define your organization/person
- [FAQ Page](/docs/schema-org/guides/recipes/faq) - Add FAQ structured data
- [Blog Posts](/docs/schema-org/guides/recipes/blog) - Article structured data
