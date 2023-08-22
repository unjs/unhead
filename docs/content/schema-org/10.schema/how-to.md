## Schema.org HowTo

- **Type**: `defineHowTo(input?: HowTo)`{lang="ts"}

  Describes a HowTo guide, which contains a series of steps.

- **Component**: `SchemaOrgHowTo` _(see [how components work](/guide/guides/components))_

## Useful Links

- [HowTo - Schema.org](https://schema.org/HowTo)
- [How-To Schema Markup - Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/how-to)
- [HowTo - Yoast](https://developer.yoast.com/features/schema/pieces/howto)
- [Recipe: How To](/guide/recipes/how-to)

## Required properties

- **name** `string`

  A string describing the guide. This can be provided using route meta on the `title` key, see [defaults](#defaults).

- **step** `HowToStep[]`.

  An array of objects describing the steps in the guide. Appends the [HowToStep](https://developers.google.com/search/docs/advanced/structured-data/how-to#how-to-step) entries on to the HowTo. Completes `@type` and resolves `url` and `image`.
  

- **step.text** The full instruction text of this step.

## Examples

### Minimal

```ts
defineHowTo({
  name: 'How to tie a tie',
  step: [
    {
      url: '#step-one',
      text: 'Button your shirt how you\'d like to wear it, then drape the tie around your neck. Make the thick end about 1/3rd longer than the short end. For formal button down shirts, it usually works best with the small end of the tie between 4th and 5th button.',
      image: '/1x1/photo.jpg',
    },
    {
      url: '#step-two',
      text: 'Cross the long end over the short end. This will form the basis for your knot.',
      image: '/1x1/photo.jpg',
    }, {
      url: '#step-three',
      text: 'Bring the long end back under the short end, then throw it back over the top of the short end in the other direction. ',
      image: '/1x1/photo.jpg',
    }, {
      text: 'Now pull the long and through the loop near your neck, forming another loop near your neck.',
      image: '/1x1/photo.jpg',
    }, {
      text: 'Pull the long end through that new loop and tighten to fit! ',
      image: '/1x1/photo.jpg',
    },
  ]
})
```

## Defaults

- **@type**: `HowTo`
- **@id**: `${canonicalUrl}#howTo`
- **name**: `currentRouteMeta.title` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **image**: `currentRouteMeta.image` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **description**: `currentRouteMeta.description` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **inLanguage**: `options.defaultLanguage` _(see: [user Config](/guide/guides/user-config))_
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
