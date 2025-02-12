export interface Base {
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
  target?: string
}
