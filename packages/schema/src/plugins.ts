import type { Unhead } from '@unhead/schema/src/head'

export interface RenderDomHeadOptions {
  /**
   * Document to use for rendering. Allows stubbing for testing.
   */
  document?: Document
}

export interface DomPluginOptions extends RenderDomHeadOptions {
  render: ((head: Unhead<any>) => Promise<void>)
}
