import type { GlobalAttributes } from './attributes/global'

export interface HtmlAttributes extends Pick<GlobalAttributes, 'lang' | 'dir' | 'translate' | 'class' | 'style' | 'id'> {
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
