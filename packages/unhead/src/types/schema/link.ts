import type { DataKeys } from './attributes/data'
import type { HttpEventAttributes } from './attributes/event'
import type { GlobalAttributes } from './attributes/global'
import type { ReferrerPolicy } from './shared'
import type { Blocking } from './struct/blocking'

// ============================================================================
// Link Type Narrowing
// ============================================================================
// This implements discriminated unions for link types based on the `rel` attribute.
// Each link type only exposes properties relevant to that specific type.

/**
 * Events that fire on link elements (load/error)
 */
export type LinkHttpEvents = Pick<HttpEventAttributes, 'onload' | 'onerror'>

/**
 * Base properties shared by all link types
 */
export interface LinkBase extends Pick<GlobalAttributes, 'nonce' | 'id'>, Blocking, DataKeys {
  /**
   * Provides a hint of the relative priority to use when fetching a preloaded resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-fetchpriority
   */
  fetchpriority?: 'high' | 'low' | 'auto'
  /**
   * A string indicating which referrer to use when fetching the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-referrerpolicy
   */
  referrerpolicy?: ReferrerPolicy
}

// ============================================================================
// Stylesheet Link
// ============================================================================

/**
 * Stylesheet-specific link (fires events)
 */
export interface StylesheetLink extends LinkBase, LinkHttpEvents {
  rel: 'stylesheet'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
  /**
   * This attribute specifies the media that the linked resource applies to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-media
   */
  media?: string
  /**
   * Contains inline metadata — a base64-encoded cryptographic hash of the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-integrity
   */
  integrity?: string
  /**
   * This enumerated attribute indicates whether CORS must be used when fetching the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-crossorigin
   */
  crossorigin?: '' | 'anonymous' | 'use-credentials'
  /**
   * The title attribute has special semantics on the `<link>` element.
   * When used on a `<link rel="stylesheet">` it defines a default or an alternate stylesheet.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-title
   */
  title?: string
  /**
   * Whether the stylesheet is disabled.
   */
  disabled?: boolean
}

// ============================================================================
// Preload Links - Narrowed by `as` value
// ============================================================================

/**
 * Base for preload links (fires events)
 */
export interface PreloadLinkBase extends LinkBase, LinkHttpEvents {
  rel: 'preload'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
  /**
   * This enumerated attribute indicates whether CORS must be used when fetching the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-crossorigin
   */
  crossorigin?: '' | 'anonymous' | 'use-credentials'
  /**
   * Contains inline metadata — a base64-encoded cryptographic hash of the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-integrity
   */
  integrity?: string
  /**
   * This attribute specifies the media that the linked resource applies to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-media
   */
  media?: string
}

/**
 * Preload: image (has imagesrcset/imagesizes)
 */
export interface PreloadImageLink extends PreloadLinkBase {
  as: 'image'
  type?: 'image/webp' | 'image/avif' | 'image/png' | 'image/jpeg' | 'image/gif' | 'image/svg+xml' | (string & Record<never, never>)
  /**
   * For rel="preload" and as="image" only, the imagesizes attribute indicates
   * to preload the appropriate resource used by an img element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-imagesizes
   */
  imagesizes?: string
  /**
   * For rel="preload" and as="image" only, the imagesrcset attribute indicates
   * to preload the appropriate resource used by an img element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-imagesrcset
   */
  imagesrcset?: string
}

/**
 * Preload: font
 */
export interface PreloadFontLink extends PreloadLinkBase {
  as: 'font'
  type?: 'font/woff2' | 'font/woff' | 'font/ttf' | 'font/otf' | (string & Record<never, never>)
  /**
   * For fonts, crossorigin is required for CORS.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-crossorigin
   */
  crossorigin: '' | 'anonymous' | 'use-credentials'
}

/**
 * Preload: script
 */
export interface PreloadScriptLink extends PreloadLinkBase {
  as: 'script'
  type?: 'text/javascript' | 'module' | (string & Record<never, never>)
}

/**
 * Preload: style
 */
export interface PreloadStyleLink extends PreloadLinkBase {
  as: 'style'
  type?: 'text/css' | (string & Record<never, never>)
}

/**
 * Preload: other types
 */
export interface PreloadOtherLink extends PreloadLinkBase {
  as: 'audio' | 'document' | 'embed' | 'fetch' | 'object' | 'track' | 'video' | 'worker'
  type?: string
}

/**
 * Combined preload union
 */
export type PreloadLink
  = | PreloadImageLink
    | PreloadFontLink
    | PreloadScriptLink
    | PreloadStyleLink
    | PreloadOtherLink

// ============================================================================
// Modulepreload Link
// ============================================================================

/**
 * Modulepreload-specific link (fires events)
 */
export interface ModulepreloadLink extends LinkBase, LinkHttpEvents {
  rel: 'modulepreload'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
  /**
   * Contains inline metadata — a base64-encoded cryptographic hash of the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-integrity
   */
  integrity?: string
  /**
   * This enumerated attribute indicates whether CORS must be used when fetching the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-crossorigin
   */
  crossorigin?: '' | 'anonymous' | 'use-credentials'
}

// ============================================================================
// Prefetch Link
// ============================================================================

/**
 * Prefetch-specific link
 */
export interface PrefetchLink extends LinkBase {
  rel: 'prefetch'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
  /**
   * This attribute is used when rel="prefetch" to specify the type of content being loaded.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as
   */
  as?: 'audio' | 'document' | 'embed' | 'fetch' | 'font' | 'image' | 'object' | 'script' | 'style' | 'track' | 'video' | 'worker'
  /**
   * This enumerated attribute indicates whether CORS must be used when fetching the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-crossorigin
   */
  crossorigin?: '' | 'anonymous' | 'use-credentials'
}

// ============================================================================
// Icon Links
// ============================================================================

/**
 * Icon-specific link
 */
export interface IconLink extends LinkBase {
  rel: 'icon' | 'apple-touch-icon' | 'shortcut icon'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
  /**
   * This attribute defines the sizes of the icons for visual media contained in the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-sizes
   */
  sizes?: 'any' | '16x16' | '32x32' | '48x48' | '64x64' | '96x96' | '128x128' | '180x180' | '192x192' | '512x512' | (string & Record<never, never>)
  /**
   * This attribute is used to define the type of the content linked to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-type
   */
  type?: 'image/png' | 'image/svg+xml' | 'image/x-icon' | 'image/gif' | 'image/webp' | (string & Record<never, never>)
  /**
   * The color attribute is used with the mask-icon link type.
   *
   * @see https://html.spec.whatwg.org/multipage/semantics.html#attr-link-color
   */
  color?: string
}

// ============================================================================
// Manifest Link
// ============================================================================

/**
 * Manifest link
 */
export interface ManifestLink extends LinkBase {
  rel: 'manifest'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
  /**
   * This enumerated attribute indicates whether CORS must be used when fetching the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-crossorigin
   */
  crossorigin?: '' | 'anonymous' | 'use-credentials'
}

// ============================================================================
// Canonical Link
// ============================================================================

/**
 * Canonical link
 */
export interface CanonicalLink extends LinkBase {
  rel: 'canonical'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
}

// ============================================================================
// DNS-Prefetch Link
// ============================================================================

/**
 * DNS-prefetch link (no events, minimal props)
 */
export interface DnsPrefetchLink extends LinkBase {
  rel: 'dns-prefetch'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
}

// ============================================================================
// Preconnect Link
// ============================================================================

/**
 * Preconnect link (no events)
 */
export interface PreconnectLink extends LinkBase {
  rel: 'preconnect'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
  /**
   * This enumerated attribute indicates whether CORS must be used when fetching the resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-crossorigin
   */
  crossorigin?: '' | 'anonymous' | 'use-credentials'
}

// ============================================================================
// Prerender Link
// ============================================================================

/**
 * Prerender link
 */
export interface PrerenderLink extends LinkBase {
  rel: 'prerender'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
}

// ============================================================================
// Alternate Link
// ============================================================================

/**
 * Alternate link (RSS, translations, etc.)
 */
export interface AlternateLink extends LinkBase {
  rel: 'alternate'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
  /**
   * This attribute is used to define the type of the content linked to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-type
   */
  type?: 'application/rss+xml' | 'application/atom+xml' | 'application/json' | (string & Record<never, never>)
  /**
   * This attribute indicates the language of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-hreflang
   */
  hreflang?: string
  /**
   * The title attribute defines the title of the link.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-title
   */
  title?: string
  /**
   * This attribute specifies the media that the linked resource applies to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-media
   */
  media?: string
}

// ============================================================================
// Other Standard Links
// ============================================================================

/**
 * Author link
 */
export interface AuthorLink extends LinkBase {
  rel: 'author'
  href: string
}

/**
 * License link
 */
export interface LicenseLink extends LinkBase {
  rel: 'license'
  href: string
}

/**
 * Help link
 */
export interface HelpLink extends LinkBase {
  rel: 'help'
  href: string
}

/**
 * Search link
 */
export interface SearchLink extends LinkBase {
  rel: 'search'
  href: string
  type?: 'application/opensearchdescription+xml' | (string & Record<never, never>)
  title?: string
}

/**
 * Prev/Next navigation links
 */
export interface PrevLink extends LinkBase {
  rel: 'prev'
  href: string
}

export interface NextLink extends LinkBase {
  rel: 'next'
  href: string
}

/**
 * Pingback link
 */
export interface PingbackLink extends LinkBase {
  rel: 'pingback'
  href: string
}

// ============================================================================
// Generic/Fallback Link
// ============================================================================

/**
 * Fallback for custom/unknown rel types (keeps full flexibility)
 * Note: Event handlers are added separately via MaybeEventFnHandlers in head.ts
 */
export interface GenericLink extends LinkBase {
  rel?: string
  href?: string
  as?: 'audio' | 'document' | 'embed' | 'fetch' | 'font' | 'image' | 'object' | 'script' | 'style' | 'track' | 'video' | 'worker' | (string & Record<never, never>)
  sizes?: string
  type?: string
  media?: string
  crossorigin?: '' | 'anonymous' | 'use-credentials'
  integrity?: string
  hreflang?: string
  imagesizes?: string
  imagesrcset?: string
  color?: string
  title?: string
  disabled?: boolean
  prefetch?: string
}

// ============================================================================
// Link Discriminated Union
// ============================================================================

/**
 * Discriminated union of all link types.
 * Order matters for TypeScript narrowing - specific types before generic.
 */
export type Link
  = | StylesheetLink
    | PreloadLink
    | ModulepreloadLink
    | PrefetchLink
    | IconLink
    | ManifestLink
    | CanonicalLink
    | DnsPrefetchLink
    | PreconnectLink
    | PrerenderLink
    | AlternateLink
    | AuthorLink
    | LicenseLink
    | HelpLink
    | SearchLink
    | PrevLink
    | NextLink
    | PingbackLink
    | GenericLink

// ============================================================================
// Legacy Exports (for backwards compatibility during migration)
// ============================================================================

export type LinkRelTypes = 'alternate'
  | 'author'
  | 'shortcut icon'
  | 'bookmark'
  | 'canonical'
  | 'dns-prefetch'
  | 'external'
  | 'help'
  | 'icon'
  | 'license'
  | 'manifest'
  | 'me'
  | 'modulepreload'
  | 'next'
  | 'nofollow'
  | 'noopener'
  | 'noreferrer'
  | 'opener'
  | 'pingback'
  | 'preconnect'
  | 'prefetch'
  | 'preload'
  | 'prerender'
  | 'prev'
  | 'search'
  | 'shortlink'
  | 'stylesheet'
  | 'tag'
  | 'apple-touch-icon'
  | 'apple-touch-startup-image'

/**
 * @deprecated Use the narrowed Link union type instead
 */
export type LinkWithoutEvents = GenericLink
