import type { DomPluginOptions, Unhead } from '@unhead/schema'
import { renderDOMHead } from './renderDOMHead'

/**
 * Queue a debounced update of the DOM head.
 */
export function debouncedRenderDOMHead<T extends Unhead<any>>(head: T, options: DomPluginOptions = {}) {
  const fn = options.delayFn || (fn => setTimeout(fn, 10))
  return head._domDebouncedUpdatePromise = head._domDebouncedUpdatePromise || new Promise<void>(resolve => fn(() => {
    return renderDOMHead(head, options)
      .then(() => {
        delete head._domDebouncedUpdatePromise
        resolve()
      })
  }))
}
