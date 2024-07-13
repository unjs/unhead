import type { Unhead } from '@unhead/schema'
import type { RenderDomHeadOptions } from './renderDOMHead'
import { renderDOMHead } from './renderDOMHead'

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
  const fn = options.delayFn || (fn => setTimeout(fn, 10))
  return head._domUpdatePromise = head._domUpdatePromise || new Promise<void>(resolve => fn(() => {
    return renderDOMHead(head, options)
      .then(() => {
        delete head._domUpdatePromise
        resolve()
      })
  }))
}
