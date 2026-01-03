import type { Unhead } from './head'
import type { HeadTag } from './tags'

export interface RenderDomHeadOptions {
  /**
   * Document to use for rendering. Allows stubbing for testing.
   */
  document?: Document
  /**
   * Custom tag weight function for sorting.
   */
  tagWeight?: (tag: HeadTag) => number
}

export interface DomPluginOptions extends RenderDomHeadOptions {
  render: ((head: Unhead<any>) => void)
}
