---
title: Image Schema
description: Use defineImage() to add ImageObject structured data with captions, dimensions, content URLs, and language metadata.
---

## Schema.org Image

- **Type**: `defineImage<T extends Record<string, any>>(input?: ImageObject & T)`{lang="ts"}

Describes an individual image (usually in the context of an embedded media object).

## Useful Links

- [ImageObject - Schema.org](https://schema.org/ImageObject)
- [Image metadata - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata)

## Required properties

- **url** or **contentUrl** `string`

  The image file URL. Relative URLs become absolute.

## Google image metadata

For licensable images, add `creator`, `creditText`, `copyrightNotice`, and at least one of `license` or `acquireLicensePage`. Unhead resolves a nested creator as a Person or Organization and makes license URLs absolute.

## Defaults

- **@type**: `ImageObject`
- **@id**: `${canonicalHost}#/schema/image/{n}`
- **inLanguage**: `inLanguage` from resolved page metadata
- **contentUrl**: `url`

## Resolves

See [Global Resolves](/docs/schema-org/guides/get-started/overview#how-does-schemaorg-get-page-data) for full context.

- `creator` resolves as a Person or Organization

- `license` and `acquireLicensePage` become absolute URLs

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
interface ImageBase extends Thing {
  caption?: string
  height?: number
  width?: number
  inLanguage?: string
  name?: string
  description?: string
  encodingFormat?: string
  creator?: NodeRelations<Identity>
  creditText?: string
  copyrightNotice?: string
  license?: string
  acquireLicensePage?: string
}

type ImageLocation
  = | { url: string, contentUrl?: string }
    | { url?: string, contentUrl: string }

export type ImageSimple = ImageBase & ImageLocation
```
