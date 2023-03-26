import type { Unhead } from '@unhead/schema'
import type { RenderDomHeadOptions } from './renderDOMHead'
import { renderDOMHead } from './renderDOMHead'

/**
 * Global instance of the dom update promise. Used for debounding head updates.
 */
let domUpdatePromise: Promise<void> | null = null

export interface DebouncedRenderDomHeadOptions extends RenderDomHeadOptions {
  /**
   * Specify a custom delay function for delaying the render.
   */
  delayFn?: (fn: () => void) => void
}

/**
 * Queue a debounced update of the DOM head.
 */
export async function debouncedRenderDOMHead<T extends Unhead<any>>(head: T, options: DebouncedRenderDomHeadOptions = {}) {
  // within the debounced dom update we need to compute all the tags so that watchEffects still works
  function doDomUpdate() {
    domUpdatePromise = null
    return renderDOMHead(head, options)
  }
  // we want to delay for the hydration chunking
  const delayFn = options.delayFn || (fn => setTimeout(fn, 10))
  return domUpdatePromise = domUpdatePromise || new Promise(resolve => delayFn(() => resolve(doDomUpdate())))
}
