## Schema.org Image

- **Type**: `defineImage(input?: Image)`{lang="ts"}

Describes an individual image (usually in the context of an embedded media object).

- **Component**: `SchemaOrgImage` _(see [how components work](/guide/guides/components))_

## Useful Links

- [ImageObject - Schema.org](https://schema.org/ImageObject)
- [Image - Yoast](https://developer.yoast.com/features/schema/pieces/image)

## Required properties

- **url** `string`

  The URL of the image file (e.g., /images/cat.jpg).


## Defaults

- **@type**: `ImageObject`
- **@id**: `${canonicalUrl}#/schema/image/${hash(image.url)}`
- **inLanguage**: `options.defaultLanguage` (only when caption is provided) _(see: [user Config](/guide/guides/user-config))_
- **contentUrl**: is set to `url`


## Resolves

See [Global Resolves](/guide/getting-started/how-it-works#global-resolves) for full context.

- `width` and `height` must be provided for either to be included

## Examples


### Minimal

```ts
defineImage({
  url: '/cat.jpg',
})
```


## Types

```ts
export interface ImageSimple extends Thing {
  /**
   * The URL of the image file (e.g., /images/cat.jpg).
   */
  url: string
  /**
   * The fully-qualified, absolute URL of the image file (e.g., https://www.example.com/images/cat.jpg).
   * Note: The contentUrl and url properties are intentionally duplicated.
   */
  contentUrl?: string
  /**
   * A text string describing the image.
   * - Fall back to the image alt attribute if no specific caption field exists or is defined.
   */
  caption?: string
  /**
   * The height of the image in pixels.
   * - Must be used with width.
   */
  height?: number
  /**
   * The width of the image in pixels.
   * - Must be used with height.
   */
  width?: number
  /**
   * The language code for the textual content; e.g., en-GB.
   * - Only needed when providing a caption.
   */
  inLanguage?: string
}
```
