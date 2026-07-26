---
title: HowTo Schema - JSON-LD Guide & Examples
description: Add HowTo structured data with Unhead, including step-by-step JSON-LD, images, supplies, tools, and time estimates.
navigation:
  title: HowTo
---

HowTo schema marks up step-by-step instructions for tutorials, guides, DIY instructions, and other how-to content. Google deprecated How-to rich results in September 2023.

## JSON-LD Example

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Tie a Tie",
  "step": [
    {
      "@type": "HowToStep",
      "text": "Drape the tie around your neck with the wide end on your right, about 1/3 longer than the narrow end.",
      "image": "https://example.com/step1.jpg"
    },
    {
      "@type": "HowToStep",
      "text": "Cross the wide end over the narrow end, then bring it underneath.",
      "image": "https://example.com/step2.jpg"
    }
  ],
  "totalTime": "PT5M"
}
```

::tip{icon="i-heroicons-wrench-screwdriver"}
Use the [Schema.org Generator](/tools/schema-generator) to build your structured data visually.
::

## Schema.org HowTo

- **Type**: `defineHowTo<T extends Record<string, any>>(input?: HowTo & T)`{lang="ts"}

  Describes a HowTo guide, which contains a series of steps.

## Useful Links

- [HowTo - Schema.org](https://schema.org/HowTo)
- [How-to rich result deprecation - Google Search Central](https://developers.google.com/search/blog/2023/08/howto-faq-changes)

## Required properties

- **name** `string`

  A string describing the guide. Route metadata on the `title` key can provide this value; see [Defaults](#defaults).

- **step** `NodeRelations<HowToStep | string>[]`

  An array of objects or strings describing the steps in the guide. Unhead adds the `HowToStep` type and resolves supported `url`, `image`, and `itemListElement` fields.

- **step.text** `string`

  The full instruction text for an object step. A string step is converted to `{ text: value }`.

## Examples

### Minimal

```ts
defineHowTo({
  name: 'How to tie a tie',
  step: [
    {
      url: '#step-one',
      text: 'Button your shirt, then drape the tie around your neck. Let the wide end hang about one-third lower than the narrow end.',
      image: '/1x1/photo.jpg',
    },
    {
      url: '#step-two',
      text: 'Cross the long end over the short end. This will form the basis for your knot.',
      image: '/1x1/photo.jpg',
    },
    {
      url: '#step-three',
      text: 'Bring the wide end under the narrow end, then pass it across the front in the other direction.',
      image: '/1x1/photo.jpg',
    },
    {
      text: 'Pull the wide end up through the loop around your neck.',
      image: '/1x1/photo.jpg',
    },
    {
      text: 'Pull the wide end through the front loop, then tighten the knot.',
      image: '/1x1/photo.jpg',
    },
  ]
})
```

## Defaults

- **@type**: `HowTo`
- **@id**: `${canonicalUrl}#howto`
- **name**: `title` from resolved page metadata _(see: [Schema.org Params](/docs/schema-org/guides/core-concepts/params))_
- **image**: `image` from resolved page metadata
- **description**: `description` from resolved page metadata
- **inLanguage**: `inLanguage` from resolved page metadata
- **mainEntityOfPage**: WebPage Reference

## Types

```ts
/**
 * Instructions that explain how to achieve a result by performing a sequence of steps.
 */
export interface HowToSimple extends Thing {
  /**
   * A string describing the guide.
   */
  name: string
  /**
   * An array of howToStep objects
   */
  step: NodeRelations<HowToStep | string>[]
  /**
   * The total time required to perform all instructions or directions (including time to prepare the supplies),
   * in ISO 8601 duration format.
   */
  totalTime?: string
  /**
   * Introduction or description content relating to the HowTo guide.
   */
  description?: string
  /**
   * The language code for the guide; e.g., en-GB.
   */
  inLanguage?: string
  /**
   * The estimated cost of the supplies consumed when performing instructions.
   */
  estimatedCost?: string | unknown
  /**
   * Image of the completed how-to.
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * A supply consumed when performing instructions or a direction.
   */
  supply?: string | unknown
  /**
   * An object used (but not consumed) when performing instructions or a direction.
   */
  tool?: string | unknown
  /**
   * A video of the how-to. Follow the list of required and recommended Video properties.
   * Mark steps of the video with hasPart.
   */
  video?: NodeRelations<VideoObject | string>
  /**
   * The time required to prepare for the how-to, in ISO 8601 duration format.
   */
  prepTime?: string
  /**
   * The time it takes to perform the how-to, in ISO 8601 duration format.
   */
  performTime?: string
  /**
   * The quantity that results from performing the how-to.
   */
  yield?: string
}
```

```ts
export interface HowToStepSimple extends Thing {
  /**
   * A link to a fragment identifier (an 'ID anchor') of the individual step
   * (e.g., https://www.example.com/example-page/#recipe-step-5).
   */
  url?: string
  /**
   * The instruction string
   * ("e.g., "Bake at 200*C for 40 minutes, or until golden-brown, stirring periodically throughout").
   */
  text: string
  /**
   * The word or short phrase summarizing the step (for example, "Attach wires to post" or "Dig").
   * Don't use non-descriptive text (for example, "Step 1: [text]") or other form of step number (for example, "1. [text]").
   */
  name?: string
  /**
   * An image representing the step, referenced by ID.
   */
  image?: NodeRelations<ImageObject | string>
  /**
   * A video for this step or a clip of the video.
   */
  video?: NodeRelations<VideoObject | string>
  /**
   * A list of detailed substeps, including directions or tips.
   */
  itemListElement?: NodeRelations<HowToDirection | string>[]
}
```

## Related Schemas

- [Recipe](/docs/schema-org/api/schema/recipe): Cooking instructions
- [Article](/docs/schema-org/api/schema/article): Tutorial articles
- [Person](/docs/schema-org/api/schema/person): Instruction author
