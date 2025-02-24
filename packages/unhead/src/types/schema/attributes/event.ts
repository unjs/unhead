export interface EventAttributes {
  onafterprint?: string
  onabort?: string
  onautocomplete?: string
  onautocompleteerror?: string
  onblur?: string
  oncancel?: string
  oncanplay?: string
  oncanplaythrough?: string
  onchange?: string
  onclick?: string
  onclose?: string
  oncontextmenu?: string
  oncuechange?: string
  ondblclick?: string
  ondrag?: string
  ondragend?: string
  ondragenter?: string
  ondragleave?: string
  ondragover?: string
  ondragstart?: string
  ondrop?: string
  ondurationchange?: string
  onemptied?: string
  onended?: string
  onerror?: string
  onfocus?: string
  oninput?: string
  oninvalid?: string
  onkeydown?: string
  onkeypress?: string
  onkeyup?: string
  onload?: string
  onloadeddata?: string
  onloadedmetadata?: string
  onloadstart?: string
  onmousedown?: string
  onmouseenter?: string
  onmouseleave?: string
  onmousemove?: string
  onmouseout?: string
  onmouseover?: string
  onmouseup?: string
  onmousewheel?: string
  onpause?: string
  onplay?: string
  onplaying?: string
  onprogress?: string
  onratechange?: string
  onreset?: string
  onresize?: string
  onscroll?: string
  onseeked?: string
  onseeking?: string
  onselect?: string
  onshow?: string
  onsort?: string
  onstalled?: string
  onsubmit?: string
  onsuspend?: string
  ontimeupdate?: string
  ontoggle?: string
  onvolumechange?: string
  onwaiting?: string
}

export interface HttpEventAttributes {
  /**
   * Script to be run on abort
   */
  onabort?: string
  /**
   * Script to be run when an error occurs when the file is being loaded
   */
  onerror?: string
  /**
   * Script to be run when the file is loaded
   */
  onload?: string
  /**
   * The progress event is fired periodically when a request receives more data.
   */
  onprogress?: string
  /**
   * Script to be run just as the file begins to load before anything is actually loaded
   */
  onloadstart?: string
}
