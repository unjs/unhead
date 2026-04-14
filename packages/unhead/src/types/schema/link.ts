import type { DeepReadonly } from '../util'
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
 * Base fields for image preload links.
 */
interface PreloadImageLinkFields extends Omit<PreloadLinkBase, 'href'> {
  as: 'image'
  /**
   * This attribute specifies the URL of the linked resource.
   * Optional for image preloads when using imagesrcset instead.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href?: string
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
 * Preload: image (has imagesrcset/imagesizes).
 * Requires at least one of `href` or `imagesrcset`.
 */
export type PreloadImageLink
  = | (PreloadImageLinkFields & { href: string })
    | (PreloadImageLinkFields & { imagesrcset: string })

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
 * Favicon link.
 *
 * Prefer `rel: 'icon'` over `'shortcut icon'` — the `shortcut` keyword is non-standard
 * and was only used by older versions of Internet Explorer.
 */
export interface FaviconLink extends LinkBase {
  rel: 'icon' | 'shortcut icon'
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
  sizes?: 'any' | '16x16' | '32x32' | '48x48' | '64x64' | '96x96' | '128x128' | '192x192' | '512x512' | (string & Record<never, never>)
  /**
   * This attribute is used to define the type of the content linked to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-type
   */
  type?: 'image/png' | 'image/svg+xml' | 'image/x-icon' | 'image/gif' | 'image/webp' | (string & Record<never, never>)
}

/**
 * Apple touch icon link
 */
export interface AppleTouchIconLink extends LinkBase {
  rel: 'apple-touch-icon'
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
  sizes?: '180x180' | '152x152' | '120x120' | '76x76' | (string & Record<never, never>)
  /**
   * This attribute is used to define the type of the content linked to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-type
   */
  type?: 'image/png' | (string & Record<never, never>)
}

/**
 * Mask icon link (Safari pinned tab). Requires `color`.
 *
 * @see https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/pinnedTabs/pinnedTabs.html
 */
export interface MaskIconLink extends LinkBase {
  rel: 'mask-icon'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
  /**
   * The color for the mask icon. Required per spec.
   *
   * @see https://html.spec.whatwg.org/multipage/semantics.html#attr-link-color
   */
  color: string
}

/**
 * Combined icon link union
 */
export type IconLink = FaviconLink | AppleTouchIconLink | MaskIconLink

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
 * Alternate language link (hreflang translations)
 */
export interface AlternateLanguageLink extends LinkBase {
  rel: 'alternate'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
  /**
   * This attribute indicates the language of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-hreflang
   */
  hreflang: 'x-default' | 'en' | 'en-US' | 'en-GB' | 'de' | 'fr' | 'es' | 'it' | 'ja' | 'ko' | 'nl' | 'pl' | 'pt' | 'pt-BR' | 'ru' | 'zh' | 'zh-CN' | 'zh-TW' | 'ar' | 'hi' | 'id' | 'th' | 'tr' | 'uk' | 'vi' | (string & Record<never, never>)
  /**
   * The title attribute defines the title of the link.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-title
   */
  title?: string
  /**
   * This attribute is used to define the type of the content linked to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-type
   */
  type?: string
  /**
   * This attribute specifies the media that the linked resource applies to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-media
   */
  media?: string
}

/**
 * Alternate feed link (RSS, Atom, JSON Feed)
 */
export interface AlternateFeedLink extends LinkBase {
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
  type: 'application/rss+xml' | 'application/atom+xml' | 'application/json' | (string & Record<never, never>)
  /**
   * The title attribute defines the title of the link.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-title
   */
  title?: string
  /**
   * This attribute indicates the language of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-hreflang
   */
  hreflang?: 'x-default' | 'en' | 'en-US' | 'en-GB' | 'de' | 'fr' | 'es' | 'it' | 'ja' | 'ko' | 'nl' | 'pl' | 'pt' | 'pt-BR' | 'ru' | 'zh' | 'zh-CN' | 'zh-TW' | 'ar' | 'hi' | 'id' | 'th' | 'tr' | 'uk' | 'vi' | (string & Record<never, never>)
}

/**
 * Alternate media link (responsive/device-specific)
 */
export interface AlternateMediaLink extends LinkBase {
  rel: 'alternate'
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
  media: string
  /**
   * The title attribute defines the title of the link.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-title
   */
  title?: string
  /**
   * This attribute is used to define the type of the content linked to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-type
   */
  type?: string
}

/**
 * Bare alternate link without hreflang, type, or media.
 * Valid HTML, typically used as a fallback or generic alternate.
 */
export interface BareAlternateLink extends LinkBase {
  rel: 'alternate'
  /**
   * This attribute specifies the URL of the linked resource.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-href
   */
  href: string
}

/**
 * Combined alternate link union.
 * Accepts language (hreflang), feed (type), responsive (media), or bare alternate links.
 */
export type AlternateLink = AlternateLanguageLink | AlternateFeedLink | AlternateMediaLink | BareAlternateLink

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

/**
 * Me link. Identifies the resource as representing the current user
 * (IndieWeb / rel-me verification, Mastodon profile verification).
 *
 * @see https://html.spec.whatwg.org/multipage/links.html#link-type-me
 */
export interface MeLink extends LinkBase {
  rel: 'me'
  href: string
}

/**
 * Privacy policy link.
 *
 * @see https://html.spec.whatwg.org/multipage/links.html#link-type-privacy-policy
 */
export interface PrivacyPolicyLink extends LinkBase {
  rel: 'privacy-policy'
  href: string
}

/**
 * Terms of service link.
 *
 * @see https://html.spec.whatwg.org/multipage/links.html#link-type-terms-of-service
 */
export interface TermsOfServiceLink extends LinkBase {
  rel: 'terms-of-service'
  href: string
}

/**
 * Expect link. Blocks rendering until a named element is present and ready.
 *
 * @see https://html.spec.whatwg.org/multipage/links.html#link-type-expect
 */
export interface ExpectLink extends LinkBase {
  rel: 'expect'
  href: string
  blocking?: 'render'
}

/**
 * Webmention endpoint link (IndieWeb).
 *
 * @see https://www.w3.org/TR/webmention/
 */
export interface WebmentionLink extends LinkBase {
  rel: 'webmention'
  href: string
}

/**
 * Compression dictionary link (experimental).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#compression-dictionary
 */
export interface CompressionDictionaryLink extends LinkBase {
  rel: 'compression-dictionary'
  href: string
}

/**
 * Sitemap link. Points to a sitemap for the site.
 *
 * @see https://www.iana.org/assignments/link-relations/link-relations.xhtml
 */
export interface SitemapLink extends LinkBase {
  rel: 'sitemap'
  href: string
  type?: 'application/xml' | (string & Record<never, never>)
  title?: string
}

/**
 * Apple touch startup image link. Specifies a splash screen image for iOS
 * when a web app is launched from the home screen.
 *
 * @see https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
 */
export interface AppleTouchStartupImageLink extends LinkBase {
  rel: 'apple-touch-startup-image'
  href: string
  media?: string
}

/**
 * AMP HTML link. Points to the AMP version of the current document.
 *
 * @see https://amp.dev/documentation/guides-and-tutorials/start/create/prepare_for_discovery/
 */
export interface AmpHtmlLink extends LinkBase {
  rel: 'amphtml'
  href: string
}

/**
 * WebSub hub link. Points to a WebSub hub for real-time content distribution.
 *
 * @see https://www.w3.org/TR/websub/
 */
export interface HubLink extends LinkBase {
  rel: 'hub'
  href: string
}

/**
 * Alternate stylesheet link. User-selectable alternate stylesheet.
 * Requires a `title` to appear in the browser's stylesheet picker.
 *
 * @see https://html.spec.whatwg.org/multipage/semantics.html#rel-alternate-stylesheet
 */
export interface AlternateStylesheetLink extends LinkBase, LinkHttpEvents {
  rel: 'alternate stylesheet'
  href: string
  title: string
  media?: string
  crossorigin?: '' | 'anonymous' | 'use-credentials'
  integrity?: string
  type?: 'text/css' | (string & Record<never, never>)
  disabled?: boolean
}

// ============================================================================
// Generic/Fallback Link
// ============================================================================

/**
 * Union of all `rel` values that have narrowed link type definitions.
 * Useful for building type guards or conditional logic based on `rel` values.
 */
export type KnownLinkRel
  = | 'stylesheet'
    | 'alternate stylesheet'
    | 'preload'
    | 'modulepreload'
    | 'prefetch'
    | 'icon'
    | 'shortcut icon'
    | 'apple-touch-icon'
    | 'mask-icon'
    | 'manifest'
    | 'canonical'
    | 'dns-prefetch'
    | 'preconnect'
    | 'prerender'
    | 'alternate'
    | 'author'
    | 'license'
    | 'help'
    | 'search'
    | 'prev'
    | 'next'
    | 'pingback'
    | 'me'
    | 'webmention'
    | 'privacy-policy'
    | 'terms-of-service'
    | 'expect'
    | 'compression-dictionary'
    | 'sitemap'
    | 'apple-touch-startup-image'
    | 'amphtml'
    | 'hub'

/**
 * Fallback for custom or unknown `rel` types.
 *
 * Not included in the {@link Link} union to prevent silent absorption of known
 * `rel` values (e.g. so `rel: 'preload'` without `as` stays an error instead of
 * collapsing into this permissive shape).
 *
 * For non-standard `rel` values not covered by {@link KnownLinkRel}, prefer
 * {@link defineLink}, which enforces strict narrowing on known rels while
 * accepting `GenericLink` for anything else:
 *
 * ```ts
 * import { defineLink } from 'unhead'
 * useHead({ link: [defineLink({ rel: 'openid2.provider', href: 'https://...' })] })
 * ```
 */
export interface GenericLink extends LinkBase {
  rel: string
  href: string
  as?: 'audio' | 'document' | 'embed' | 'fetch' | 'font' | 'image' | 'object' | 'script' | 'style' | 'track' | 'video' | 'worker' | (string & Record<never, never>)
  sizes?: string
  type?: string
  media?: string
  crossorigin?: '' | 'anonymous' | 'use-credentials'
  integrity?: string
  hreflang?: 'x-default' | 'en' | 'en-US' | 'en-GB' | 'de' | 'fr' | 'es' | 'it' | 'ja' | 'ko' | 'nl' | 'pl' | 'pt' | 'pt-BR' | 'ru' | 'zh' | 'zh-CN' | 'zh-TW' | 'ar' | 'hi' | 'id' | 'th' | 'tr' | 'uk' | 'vi' | (string & Record<never, never>)
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
 *
 * Each named `rel` value maps to a specific interface that enforces per-`rel` required
 * attributes. For example, `rel="preload"` requires the `as` attribute (see {@link PreloadLink}),
 * and `rel="mask-icon"` requires `color` (see {@link MaskIconLink}).
 *
 * For non-standard `rel` values not covered by {@link KnownLinkRel}, use {@link defineLink}:
 * ```ts
 * import { defineLink } from 'unhead'
 * useHead({ link: [defineLink({ rel: 'openid2.provider', href: 'https://...' })] })
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel
 */
export type Link
  = | StylesheetLink
    | AlternateStylesheetLink
    | PreloadLink
    | ModulepreloadLink
    | PrefetchLink
    | FaviconLink
    | AppleTouchIconLink
    | MaskIconLink
    | ManifestLink
    | CanonicalLink
    | DnsPrefetchLink
    | PreconnectLink
    | PrerenderLink
    | AlternateLanguageLink
    | AlternateFeedLink
    | AlternateMediaLink
    | BareAlternateLink
    | AuthorLink
    | LicenseLink
    | HelpLink
    | SearchLink
    | PrevLink
    | NextLink
    | PingbackLink
    | MeLink
    | WebmentionLink
    | PrivacyPolicyLink
    | TermsOfServiceLink
    | ExpectLink
    | CompressionDictionaryLink
    | SitemapLink
    | AppleTouchStartupImageLink
    | AmpHtmlLink
    | HubLink

// ============================================================================
// defineLink helper (type inference)
// ============================================================================

/**
 * Pick {@link Link} union members whose `rel` accepts `R`.
 *
 * Unlike `Extract<Link, { rel: R }>`, this handles members whose `rel` is itself
 * a union (e.g. {@link FaviconLink}'s `'icon' | 'shortcut icon'`).
 */
type MatchLinkByRel<R>
  = Link extends infer M
    ? M extends { rel: infer MR }
      ? R extends MR
        ? M
        : never
      : never
    : never

/**
 * Resolve a single link input to either its strict {@link Link} variant (when
 * `rel` is a {@link KnownLinkRel}) or {@link GenericLink} (for custom rels).
 */
export type InferLink<T>
  = T extends { rel: infer R }
    ? R extends KnownLinkRel
      ? DeepReadonly<MatchLinkByRel<R>>
      : R extends string
        ? DeepReadonly<GenericLink> & { rel: R }
        : never
    : never
