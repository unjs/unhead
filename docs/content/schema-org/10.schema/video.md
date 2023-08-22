## Schema.org Video

- **Type**: `defineVideo(input?: Video)`{lang="ts"}

  Describes an individual video (usually in the context of an embedded media object).

- **Component**: `SchemaOrgVideo` _(see [how components work](/guide/guides/components))_


## Useful Links

- [VideoObject - Schema.org](https://schema.org/VideoObject)
- [Video - Yoast](https://developer.yoast.com/features/schema/pieces/video)

## Required properties

- **name** `string`

  The title of the video.

  Can be provided using route meta on the `title` key, see [defaults](#defaults).

- **description** `string`

  A description of the video (falling back to the caption, then to 'No description').

  Can be provided using route meta on the `description` key, see [defaults](#defaults).

- **thumbnailUrl** `string`

  An image of the video thumbnail.

  Can be provided using route meta on the `image` key, see [defaults](#defaults).

- **uploadDate** `string`

  The date the video was published, in ISO 8601 format

  Can be provided using route meta on the `datePublished` key, see [defaults](#defaults).

## Defaults

- **@type**: `VideoObject`
- **@id**: `${canonicalUrl}#/schema/video/${hash(image.url)}`
- **inLanguage**: `options.defaultLanguage` (only when caption is provided) _(see: [user Config](/guide/guides/user-config))_
- **contentUrl**: is set to `url`


## Resolves

See [Global Resolves](/guide/getting-started/how-it-works#global-resolves) for full context.

- `width` and `height` must be provided for either to be included

## Example

```ts
defineVideo({
  name: 'My cool video',
  uploadDate: new Date(Date.UTC(2020, 10, 10)),
  url: '/image.png',
})
```


## Types

```ts
export interface VideoSimple extends Thing {
  /**
   * The title of the video.
   */
  name?: string
  /**
   * A description of the video (falling back to the caption, then to 'No description').
   */
  description?: string
  /**
   * A reference-by-ID to an imageObject.
   */
  thumbnailUrl?: NodeRelation<ImageObject>
  /**
   * The date the video was published, in ISO 8601 format (e.g., 2020-01-20).
   */
  uploadDate?: ResolvableDate
  /**
   * Whether the video should be considered 'family friendly'
   */
  isFamilyFriendly?: boolean
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
  /**
   * The duration of the video in ISO 8601 format.
   */
  duration?: string
  /**
   * A URL pointing to a player for the video.
   */
  embedUrl?: string
}
```
