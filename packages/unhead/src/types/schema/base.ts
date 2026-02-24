interface BaseFields {
  /**
   * The base URL to be used throughout the document for relative URLs. Absolute and relative URLs are allowed.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base#attr-href
   */
  href?: string
  /**
   * A keyword or author-defined name of the default browsing context to show the results of navigation from `<a>`,
   * `<area>`, or `<form>` elements without explicit target attributes.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base#attr-target
   */
  target?: '_blank' | '_self' | '_parent' | '_top' | (string & Record<never, never>)
}

/**
 * The `<base>` HTML element requires at least `href` or `target` to be valid.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
 */
export type Base
  = | (BaseFields & { href: string })
    | (BaseFields & { target: '_blank' | '_self' | '_parent' | '_top' | (string & Record<never, never>) })
