---
title: Image Schema
description: Use defineImage() to add ImageObject structured data with captions, dimensions, content URLs, and language metadata.
---

## Schema.org Image

- **Type**: `defineImage<T extends Record<string, any>>(input?: ImageObject & T)`{lang="ts"}

Describes an individual image (usually in the context of an embedded media object).

## Useful Links

- [ImageObject - Schema.org](https://schema.org/ImageObject)

## Required properties

- **url** `string`

  The URL of the image file (e.g., /images/cat.jpg).

## Defaults

- **@type**: `ImageObject`
- **@id**: `${canonicalHost}#/schema/image/{n}`
- **inLanguage**: `inLanguage` from resolved page metadata
- **contentUrl**: `url`

## Resolves

See [Global Resolves](/docs/schema-org/guides/get-started/overview#how-does-schemaorg-get-page-data) for full context.

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
   * The fully qualified, absolute URL of the image file (e.g., https://www.example.com/images/cat.jpg).
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
  /**
   * The name of the image.
   */
  name?: string
  /**
   * A description of the image.
   */
  description?: string
  /**
   * The file format or media type of the image (e.g., image/jpeg).
   */
  encodingFormat?: string
}
```
