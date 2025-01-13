export interface RenderDomHeadOptions {
  /**
   * Document to use for rendering. Allows stubbing for testing.
   */
  document?: Document
}

export interface DomPluginOptions extends RenderDomHeadOptions {
  delayFn?: (fn: () => void) => void
}
