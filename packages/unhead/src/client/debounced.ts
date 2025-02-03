import type { Unhead } from '@unhead/schema'
import { renderDOMHead } from './renderDOMHead'

/**
 * Queue a debounced update of the DOM head.
 */
export function createDebouncedDomRender(delayFunction: (fn: () => void) => void): ((head: Unhead<any>) => Promise<void>) {
  let pendingCallback: (() => void) | null = null

  return (head: Unhead<any>) => {
    if (pendingCallback) {
      pendingCallback = null
    }

    return head._domDebouncedUpdatePromise = head._domDebouncedUpdatePromise || new Promise<void>((resolve) => {
      pendingCallback = () => {
        renderDOMHead(head)
          .then(() => {
            delete head._domDebouncedUpdatePromise
            resolve()
          })
      }
      delayFunction(pendingCallback)
    })
  }
}
