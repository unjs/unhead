---
title: Video Schema
description: Use defineVideo() to add VideoObject structured data with thumbnails, duration, and upload date.
---

## Schema.org Video

- **Type**: `defineVideo<T extends Record<string, any>>(input?: VideoObject & T)`{lang="ts"}

  Describes an individual video (usually in the context of an embedded media object).

## Useful Links

- [VideoObject - Schema.org](https://schema.org/VideoObject)
- [Video Structured Data - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/video)

## Google and input properties

- **name** `string`

  The title of the video. Google requires this property for video rich results.

  Route metadata on the `title` key can provide this value; see [Defaults](#defaults).

- **description** `string`

  A description of the video. Google recommends this property. Unhead falls back to `caption`, then to `No description`.

  Route metadata on the `description` key can provide this value; see [Defaults](#defaults).

- **thumbnail** `ImageObject`

  An optional ImageObject reference for the video thumbnail.

  Page image metadata is inherited separately as `image`. Set `thumbnailUrl` explicitly when targeting Google's video feature.

- **thumbnailUrl** `string | string[]`

  A URL pointing to the video thumbnail image file. Google requires this property for video rich results; follow the [thumbnail image guidelines](https://developers.google.com/search/docs/appearance/video#valid-thumbnail).

- **uploadDate** `string`

  The date the video was published, in ISO 8601 format. Google requires this property for video rich results.

  Route metadata on the `datePublished` key can provide this value; see [Defaults](#defaults).

- **url** `string`

  The video file or page URL used by Unhead. Relative values are resolved against the configured host.

  This Unhead input is not a substitute for Google's `contentUrl` or `embedUrl` properties.

- **contentUrl** `string` or **embedUrl** `string`

  Google recommends the URL of the video bytes in `contentUrl`, or a player URL in `embedUrl` when the content URL is unavailable. Unhead passes these fields through without URL resolution, so provide absolute URLs.

## Defaults

- **@type**: `VideoObject`
- **@id**: `${canonicalHost}#/schema/video/{n}`
- **name**: `title` from resolved page metadata
- **description**: resolved page description, then `caption`, then `No description`
- **image**: `image` from resolved page metadata
- **inLanguage**: `inLanguage` from resolved page metadata
- **uploadDate**: `datePublished` from resolved page metadata

## Resolves

See [Global Resolves](/docs/schema-org/guides/get-started/overview#how-does-schemaorg-get-page-data) for full context.

- `url` and each `thumbnailUrl` are resolved to absolute URLs
- `uploadDate` accepts a Date object and is serialized as an ISO 8601 string
- a string input is cast to `{ url: input }`

## Example

```ts
defineVideo({
  name: 'My cool video',
  description: 'A short demonstration video.',
  thumbnailUrl: '/video-thumbnail.png',
  uploadDate: new Date(Date.UTC(2020, 10, 10)),
  url: '/videos/demo',
  contentUrl: 'https://example.com/video.mp4',
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
  thumbnail?: NodeRelation<ImageObject>
  /**
   * A URL pointing to the video thumbnail image file. Follow the [thumbnail image guidelines](https://developers.google.com/search/docs/appearance/video#valid-thumbnail).
   */
  thumbnailUrl?: Arrayable<string>
  /**
   * The date the video was published, in ISO 8601 format (e.g., 2020-01-20).
   */
  uploadDate?: ResolvableDate
  /**
   * Whether the video should be considered 'family friendly'
   */
  isFamilyFriendly?: boolean
  /**
   * The URL of the video file or page.
   */
  url: string
  /**
   * The fully qualified, absolute URL of the video file.
   */
  contentUrl?: string
  /**
   * A text caption for the video.
   */
  caption?: string
  /**
   * The height of the video in pixels.
   * - Must be used with width.
   */
  height?: number
  /**
   * The width of the video in pixels.
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
  /**
   * The encoding format of the video.
   */
  encodingFormat?: string
  /**
   * A transcript of the video.
   */
  transcript?: string
}
```
