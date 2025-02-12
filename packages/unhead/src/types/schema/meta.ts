import type { Stringable } from '../util'

export type MetaNames =
  'apple-itunes-app' |
  'apple-mobile-web-app-capable' |
  'apple-mobile-web-app-status-bar-style' |
  'apple-mobile-web-app-title' |
  'application-name' |
  'author' |
  'charset' |
  'color-scheme' |
  'content-security-policy' |
  'content-type' |
  'creator' |
  'default-style' |
  'description' |
  'fb:app_id' |
  'format-detection' |
  'generator' |
  'google-site-verification' |
  'google' |
  'googlebot' |
  'keywords' |
  'mobile-web-app-capable' |
  'msapplication-Config' |
  'msapplication-TileColor' |
  'msapplication-TileImage' |
  'publisher' |
  'rating' |
  'referrer' |
  'refresh' |
  'robots' |
  'theme-color' |
  'twitter:app:id:googleplay' |
  'twitter:app:id:ipad' |
  'twitter:app:id:iphone' |
  'twitter:app:name:googleplay' |
  'twitter:app:name:ipad' |
  'twitter:app:name:iphone' |
  'twitter:app:url:googleplay' |
  'twitter:app:url:ipad' |
  'twitter:app:url:iphone' |
  'twitter:card' |
  'twitter:creator:id' |
  'twitter:creator' |
  'twitter:data:1' |
  'twitter:data:2' |
  'twitter:description' |
  'twitter:image:alt' |
  'twitter:image' |
  'twitter:label:1' |
  'twitter:label:2' |
  'twitter:player:height' |
  'twitter:player:stream' |
  'twitter:player:width' |
  'twitter:player' |
  'twitter:site:id' |
  'twitter:site' |
  'twitter:title' |
  'viewport' |
  'x-ua-compatible'

export type MetaProperties = 'article:author' |
  'article:expiration_time' |
  'article:modified_time' |
  'article:published_time' |
  'article:section' |
  'article:tag' |
  'book:author' |
  'book:isbn' |
  'book:release_data' |
  'book:tag' |
  'fb:app:id' |
  'og:audio:secure_url' |
  'og:audio:type' |
  'og:audio:url' |
  'og:description' |
  'og:determiner' |
  'og:image:height' |
  'og:image:secure_url' |
  'og:image:type' |
  'og:image:url' |
  'og:image:width' |
  'og:image' |
  'og:locale:alternate' |
  'og:locale' |
  'og:site:name' |
  'og:title' |
  'og:type' |
  'og:url' |
  'og:video:height' |
  'og:video:secure_url' |
  'og:video:type' |
  'og:video:url' |
  'og:video:width' |
  'og:video' |
  'profile:first_name' |
  'profile:gender' |
  'profile:last_name' |
  'profile:username'

export interface Meta {
  /**
   * This attribute declares the document's character encoding.
   * If the attribute is present, its value must be an ASCII case-insensitive match for the string "utf-8",
   * because UTF-8 is the only valid encoding for HTML5 documents.
   * `<meta>` elements which declare a character encoding must be located entirely within the first 1024 bytes
   * of the document.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-charset
   */
  charset?: 'utf-8' | (string & Record<never, never>)
  /**
   * This attribute contains the value for the http-equiv or name attribute, depending on which is used.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-content
   */
  content?: Stringable
  /**
   * Defines a pragma directive. The attribute is named http-equiv(alent) because all the allowed values are names of
   * particular HTTP headers.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-http-equiv
   */
  ['http-equiv']?: 'content-security-policy' |
    'content-type' |
    'default-style' |
    'x-ua-compatible' |
    'refresh' |
    'accept-ch' |
    (string & Record<never, never>)
  /**
   * The name and content attributes can be used together to provide document metadata in terms of name-value pairs,
   * with the name attribute giving the metadata name, and the content attribute giving the value.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-name
   */
  name?: MetaNames | (string & Record<never, never>)
  /**
   * The property attribute is used to define a property associated with the content attribute.
   *
   * Mainly used for og and twitter meta tags.
   */
  property?: MetaProperties | (string & Record<never, never>)
  /**
   * This attribute defines the unique ID.
   */
  id?: string
  /**
   * A valid media query list that can be included to set the media the `theme-color` metadata applies to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name/theme-color
   */
  media?: '(prefers-color-scheme: light)' | '(prefers-color-scheme: dark)' | (string & Record<never, never>)
}
