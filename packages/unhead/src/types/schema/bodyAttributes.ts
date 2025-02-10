export interface BodyEvents {
  /**
   * Script to be run after the document is printed
   */
  onafterprint?: string
  /**
   * Script to be run before the document is printed
   */
  onbeforeprint?: string
  /**
   * Script to be run when the document is about to be unloaded
   */
  onbeforeunload?: string
  /**
   * Script to be run when an error occurs
   */
  onerror?: string
  /**
   * Script to be run when there has been changes to the anchor part of the a URL
   */
  onhashchange?: string
  /**
   * Fires after the page is finished loading
   */
  onload?: string
  /**
   * Script to be run when the message is triggered
   */
  onmessage?: string
  /**
   * Script to be run when the browser starts to work offline
   */
  onoffline?: string
  /**
   * Script to be run when the browser starts to work online
   */
  ononline?: string
  /**
   * Script to be run when a user navigates away from a page
   */
  onpagehide?: string
  /**
   * Script to be run when a user navigates to a page
   */
  onpageshow?: string
  /**
   * Script to be run when the window's history changes
   */
  onpopstate?: string
  /**
   * Fires when the browser window is resized
   */
  onresize?: string
  /**
   * Script to be run when a Web Storage area is updated
   */
  onstorage?: string
  /**
   * Fires once a page has unloaded (or the browser window has been closed)
   */
  onunload?: string
}

export interface BaseBodyAttributes {
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
}

export type BodyAttributes = BaseBodyAttributes & BodyEvents
