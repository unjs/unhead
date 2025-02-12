export interface HtmlAttributes {
  /**
   * The lang global attribute helps define the language of an element: the language that non-editable elements are
   * written in, or the language that the editable elements should be written in by the user.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang
   */
  lang?: string
  /**
   * The dir global attribute is an enumerated attribute that indicates the directionality of the element's text.
   */
  dir?: 'ltr' | 'rtl' | 'auto'
  /**
   * The translate global attribute is an enumerated attribute that is used to specify whether an element's
   * translatable attribute values and its Text node children should be translated when the page is localized,
   * or whether to leave them unchanged.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/translate
   */
  translate?: 'yes' | 'no'
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: string
  /**
   * The style global attribute contains CSS styling declarations to be applied to the element.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/style
   */
  style?: string
  /**
   * This attribute defines the unique ID.
   */
  id?: string
  /**
   * Open-graph protocol prefix.
   *
   * @see https://ogp.me/
   */
  prefix?: 'og: https://ogp.me/ns#' | (string & Record<never, never>)
  /**
   * XML namespace
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Namespaces_Crash_Course
   */
  xmlns?: string
  /**
   * Custom XML namespace
   *
   * @See https://developer.mozilla.org/en-US/docs/Web/SVG/Namespaces_Crash_Course
   */
  [key: `xmlns:${'og' | string}`]: string
}
