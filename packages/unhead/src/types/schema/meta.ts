import type { Stringable } from '../util'
import type { DataKeys } from './attributes/data'
import type { GlobalAttributes } from './attributes/global'

// ============================================================================
// Meta Type Narrowing
// ============================================================================
// This implements discriminated unions for meta types with mutual exclusion
// of name/property/http-equiv/charset. This prevents common mistakes like
// using both `name` and `property` on the same meta tag.
//
// Note: Deeper narrowing (e.g., viewport-specific content types) is intentionally
// skipped because:
// 1. `useSeoMeta` is the recommended path for SEO meta tags
// 2. The complexity/benefit ratio isn't favorable
// 3. Content values are too varied to narrow effectively

/**
 * Known meta name values
 */
export type MetaNames
  = | 'apple-itunes-app'
    | 'apple-mobile-web-app-capable'
    | 'apple-mobile-web-app-status-bar-style'
    | 'apple-mobile-web-app-title'
    | 'application-name'
    | 'author'
    | 'charset'
    | 'color-scheme'
    | 'content-security-policy'
    | 'content-type'
    | 'creator'
    | 'default-style'
    | 'description'
    | 'fb:app_id'
    | 'format-detection'
    | 'generator'
    | 'google-site-verification'
    | 'google'
    | 'googlebot'
    | 'keywords'
    | 'mobile-web-app-capable'
    | 'msapplication-Config'
    | 'msapplication-TileColor'
    | 'msapplication-TileImage'
    | 'publisher'
    | 'rating'
    | 'referrer'
    | 'refresh'
    | 'robots'
    | 'theme-color'
    | 'twitter:app:id:googleplay'
    | 'twitter:app:id:ipad'
    | 'twitter:app:id:iphone'
    | 'twitter:app:name:googleplay'
    | 'twitter:app:name:ipad'
    | 'twitter:app:name:iphone'
    | 'twitter:app:url:googleplay'
    | 'twitter:app:url:ipad'
    | 'twitter:app:url:iphone'
    | 'twitter:card'
    | 'twitter:creator:id'
    | 'twitter:creator'
    | 'twitter:data:1'
    | 'twitter:data:2'
    | 'twitter:description'
    | 'twitter:image:alt'
    | 'twitter:image'
    | 'twitter:label:1'
    | 'twitter:label:2'
    | 'twitter:player:height'
    | 'twitter:player:stream'
    | 'twitter:player:width'
    | 'twitter:player'
    | 'twitter:site:id'
    | 'twitter:site'
    | 'twitter:title'
    | 'viewport'
    | 'x-ua-compatible'

/**
 * Known meta property values (OpenGraph, etc.)
 */
export type MetaProperties
  = | 'article:author'
    | 'article:expiration_time'
    | 'article:modified_time'
    | 'article:published_time'
    | 'article:section'
    | 'article:tag'
    | 'book:author'
    | 'book:isbn'
    | 'book:release_data'
    | 'book:tag'
    | 'fb:app:id'
    | 'og:audio:secure_url'
    | 'og:audio:type'
    | 'og:audio:url'
    | 'og:description'
    | 'og:determiner'
    | 'og:image:height'
    | 'og:image:secure_url'
    | 'og:image:type'
    | 'og:image:url'
    | 'og:image:width'
    | 'og:image'
    | 'og:locale:alternate'
    | 'og:locale'
    | 'og:site:name'
    | 'og:title'
    | 'og:type'
    | 'og:url'
    | 'og:video:height'
    | 'og:video:secure_url'
    | 'og:video:type'
    | 'og:video:url'
    | 'og:video:width'
    | 'og:video'
    | 'profile:first_name'
    | 'profile:gender'
    | 'profile:last_name'
    | 'profile:username'

/**
 * Base properties shared by all meta types
 */
export interface MetaBase extends Pick<GlobalAttributes, 'id'>, DataKeys {
  /**
   * A valid media query list that can be included to set the media the metadata applies to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name/theme-color
   */
  media?: '(prefers-color-scheme: light)' | '(prefers-color-scheme: dark)' | (string & Record<never, never>)
}

// ============================================================================
// Name-based Meta
// ============================================================================

/**
 * Name-based meta (description, viewport, robots, etc.)
 * Mutual exclusion: no property, no http-equiv, no charset
 */
export interface NameMeta extends MetaBase {
  /**
   * The name and content attributes can be used together to provide document metadata
   * in terms of name-value pairs.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-name
   */
  name: MetaNames | (string & Record<never, never>)
  /**
   * This attribute contains the value for the name attribute.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-content
   */
  content: Stringable
}

// ============================================================================
// Property-based Meta
// ============================================================================

/**
 * Property-based meta (OpenGraph, etc.)
 * Mutual exclusion: no name, no http-equiv, no charset
 */
export interface PropertyMeta extends MetaBase {
  /**
   * The property attribute is used to define a property associated with the content attribute.
   * Mainly used for og and twitter meta tags.
   */
  property: MetaProperties | (string & Record<never, never>)
  /**
   * This attribute contains the value for the property attribute.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-content
   */
  content: Stringable
}

// ============================================================================
// HTTP-equiv Meta
// ============================================================================

/**
 * HTTP-equiv meta
 * Mutual exclusion: no name, no property, no charset
 */
export interface HttpEquivMeta extends MetaBase {
  /**
   * Defines a pragma directive. The attribute is named http-equiv(alent) because all
   * the allowed values are names of particular HTTP headers.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-http-equiv
   */
  'http-equiv': 'content-security-policy' | 'content-type' | 'default-style' | 'x-ua-compatible' | 'refresh' | 'accept-ch' | (string & Record<never, never>)
  /**
   * This attribute contains the value for the http-equiv attribute.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-content
   */
  'content': Stringable
}

// ============================================================================
// Charset Meta
// ============================================================================

/**
 * Charset meta (standalone, no content)
 * Mutual exclusion: no name, no property, no http-equiv, no content
 */
export interface CharsetMeta extends MetaBase {
  /**
   * This attribute declares the document's character encoding.
   * If the attribute is present, its value must be an ASCII case-insensitive match for the string "utf-8".
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-charset
   */
  charset: 'utf-8' | (string & Record<never, never>)
}

// ============================================================================
// Meta Discriminated Union
// ============================================================================

/**
 * Discriminated union of all meta types.
 * Provides mutual exclusion of name/property/http-equiv/charset.
 */
export type Meta = NameMeta | PropertyMeta | HttpEquivMeta | CharsetMeta
