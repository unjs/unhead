import type { HttpEventAttributes } from './attributes/event'
import type { GlobalAttributes } from './attributes/global'
import type { ReferrerPolicy } from './shared'
import type { Blocking } from './struct/blocking'

export type LinkRelTypes = 'alternate' |
  'author' |
  'shortcut icon' |
  'bookmark' |
  'canonical' |
  'dns-prefetch' |
  'external' |
  'help' |
  'icon' |
  'license' |
  'manifest' |
  'me' |
  'modulepreload' |
  'next' |
  'nofollow' |
  'noopener' |
  'noreferrer' |
  'opener' |
  'pingback' |
  'preconnect' |
  'prefetch' |
  'preload' |
  'prerender' |
  'prev' |
  'search' |
  'shortlink' |
  'stylesheet' |
  'tag' |
  'apple-touch-icon' |
  'apple-touch-startup-image'

export interface LinkBase extends Pick<GlobalAttributes, 'nonce' | 'id'>, Blocking {
  /**
   * This attribute is only used when rel="preload" or rel="prefetch" has been set on the `<link>` element.
   * It specifies the type of content being loaded by the `<link>`, which is necessary for request matching,
   * application of correct content security policy, and setting of correct Accept request header.
   * Furthermore, rel="preload" uses this as a signal for request prioritization.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as
   */
  as?: 'audio' |
    'document' |
    'embed' |
    'fetch' |
    'font' |
    'image' |
    'object' |
    'script' |
    'style' |
    'track' |
    'video' |
    'worker'
  /**
   * The color attribute is used with the mask-icon link type.
   * The attribute must only be specified on link elements that have a rel attribute
   * that contains the mask-icon keyword.
   * The value must be a string that matches the CSS `<color>` production,
   * defining a suggested color that user agents can use to customize the display
   * of the icon that the user sees when they pin your site.
   *
   * @see https://html.spec.whatwg.org/multipage/semantics.html#attr-link-color
   */
  color?: string
  /**
   * This enumerated attribute indicates whether CORS must be used when fetching the resource.
   * CORS-enabled images can be reused in the `<canvas>` element without being tainted.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-crossorigin
   */
  crossorigin?: '' |
    'anonymous' |
    'use-credentials'
  /**
   * Provides a hint of the relative priority to use when fetching a preloaded resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-fetchpriority
   */
  fetchpriority?: 'high' |
    'low' |
    'auto'
  /**
   * This attribute specifies the URL of the linked resource. A URL can be absolute or relative.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href?: string
  /**
   * This attribute indicates the language of the linked resource. It is purely advisory.
   * Allowed values are specified by RFC 5646: Tags for Identifying Languages (also known as BCP 47).
   * Use this attribute only if the href attribute is present.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-hreflang
   */
  hreflang?: string
  /**
   * For rel="preload" and as="image" only, the imagesizes attribute is a sizes attribute that indicates to preload
   * the appropriate resource used by an img element with corresponding values for its srcset and sizes attributes.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-imagesizes
   */
  imagesizes?: string
  /**
   * For rel="preload" and as="image" only, the imagesrcset attribute is a sourceset attribute that indicates
   * to preload the appropriate resource used by an img element with corresponding values for its srcset and
   * sizes attributes.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-imagesrcset
   */
  imagesrcset?: string
  /**
   * Contains inline metadata — a base64-encoded cryptographic hash of the resource (file)
   * you're telling the browser to fetch.
   * The browser can use this to verify that the fetched resource has been delivered free of unexpected manipulation.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-integrity
   */
  integrity?: string
  /**
   * This attribute specifies the media that the linked resource applies to.
   * Its value must be a media type / media query.
   * This attribute is mainly useful when linking to external stylesheets —
   * it allows the user agent to pick the best adapted one for the device it runs on.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-integrity
   */
  media?: string

  /**
   * Identifies a resource that might be required by the next navigation and that the user agent should retrieve it.
   * This allows the user agent to respond faster when the resource is requested in the future.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-prefetch
   */
  prefetch?: string

  /**
   * A string indicating which referrer to use when fetching the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-referrerpolicy
   */
  referrerpolicy?: ReferrerPolicy
  /**
   * This attribute names a relationship of the linked document to the current document.
   * The attribute must be a space-separated list of link type values.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-rel
   */
  rel?: LinkRelTypes | (string & Record<never, never>)
  /**
   * This attribute defines the sizes of the icons for visual media contained in the resource.
   * It must be present only if the rel contains a value of icon or a non-standard type
   * such as Apple's apple-touch-icon.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-sizes
   */
  sizes?: 'any' | '16x16' | '32x32' | '64x64' | '180x180' | (string & Record<never, never>)
  /**
   * The title attribute has special semantics on the `<link>` element.
   * When used on a `<link rel="stylesheet">` it defines a default or an alternate stylesheet.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-title
   */
  title?: string
  /**
   * This attribute is used to define the type of the content linked to.
   * The value of the attribute should be a MIME type such as text/html, text/css, and so on.
   * The common use of this attribute is to define the type of stylesheet being referenced (such as text/css),
   * but given that CSS is the only stylesheet language used on the web,
   * not only is it possible to omit the type attribute, but is actually now recommended practice.
   * It is also used on rel="preload" link types, to make sure the browser only downloads file types that it supports.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-type
   */
  type?: 'audio/aac' |
    'application/x-abiword' |
    'application/x-freearc' |
    'image/avif' |
    'video/x-msvideo' |
    'application/vnd.amazon.ebook' |
    'application/octet-stream' |
    'image/bmp' |
    'application/x-bzip' |
    'application/x-bzip2' |
    'application/x-cdf' |
    'application/x-csh' |
    'text/css' |
    'text/csv' |
    'application/msword' |
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' |
    'application/vnd.ms-fontobject' |
    'application/epub+zip' |
    'application/gzip' |
    'image/gif' |
    'text/html' |
    'image/vnd.microsoft.icon' |
    'text/calendar' |
    'application/java-archive' |
    'image/jpeg' |
    'text/javascript' |
    'application/json' |
    'application/ld+json' |
    'audio/midi' |
    'audio/x-midi' |
    'audio/mpeg' |
    'video/mp4' |
    'video/mpeg' |
    'application/vnd.apple.installer+xml' |
    'application/vnd.oasis.opendocument.presentation' |
    'application/vnd.oasis.opendocument.spreadsheet' |
    'application/vnd.oasis.opendocument.text' |
    'audio/ogg' |
    'video/ogg' |
    'application/ogg' |
    'audio/opus' |
    'font/otf' |
    'image/png' |
    'application/pdf' |
    'application/x-httpd-php' |
    'application/vnd.ms-powerpoint' |
    'application/vnd.openxmlformats-officedocument.presentationml.presentation' |
    'application/vnd.rar' |
    'application/rtf' |
    'application/x-sh' |
    'image/svg+xml' |
    'application/x-tar' |
    'image/tiff' |
    'video/mp2t' |
    'font/ttf' |
    'text/plain' |
    'application/vnd.visio' |
    'audio/wav' |
    'audio/webm' |
    'video/webm' |
    'image/webp' |
    'font/woff' |
    'font/woff2' |
    'application/xhtml+xml' |
    'application/vnd.ms-excel' |
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' |
    'text/xml' |
    'application/atom+xml' |
    'application/xml' |
    'application/vnd.mozilla.xul+xml' |
    'application/zip' |
    'video/3gpp' |
    'audio/3gpp' |
    'video/3gpp2' |
    'audio/3gpp2' | (string & Record<never, never>)
}

export type Link = LinkBase & HttpEventAttributes
