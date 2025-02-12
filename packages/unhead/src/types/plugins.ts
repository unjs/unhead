import type { Unhead } from './head'

export interface RenderDomHeadOptions {
  /**
   * Document to use for rendering. Allows stubbing for testing.
   */
  document?: Document
}

export interface DomPluginOptions extends RenderDomHeadOptions {
  render: ((head: Unhead<any>) => void)
}
