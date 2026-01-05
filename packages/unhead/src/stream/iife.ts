/**
 * Streaming IIFE client - minimal self-contained bundle for immediate DOM updates during HTML streaming.
 *
 * Uses the core unhead without hooks/plugins for minimal bundle size.
 *
 * @module unhead/stream/iife
 */
import type { Unhead } from '../types'
import { createDomRenderer } from '../client/renderDOMHead'
import { createUnhead } from '../unhead'

const DEFAULT_STREAM_KEY = '__unhead__'

interface StreamQueue {
  _q: any[]
  _head?: Unhead<any>
  push: (entry: any) => void
}

function init(options: { streamKey?: string } = {}) {
  const { streamKey = DEFAULT_STREAM_KEY } = options
  const win = typeof window !== 'undefined' ? window as any : undefined
  if (!win)
    return

  const queue = win[streamKey] as StreamQueue | undefined
  if (queue?._head)
    return queue._head

  const doc = typeof document !== 'undefined' ? document : undefined
  const head = createUnhead(createDomRenderer(), { document: doc })

  // Hydration lock - ignore client pushes until hydration completes
  // SSR streaming pushes (from inline scripts) happen before hydration starts
  // After IIFE init, hydration begins and components re-call useHead
  // We skip those during hydration to preserve the SSR-streamed state
  let hydrationLocked = true

  // Unlock after microtask - hydration should be complete by then
  queueMicrotask(() => {
    hydrationLocked = false
  })

  // Consume existing queue - each item in queue is an array of entries
  if (queue?._q) {
    for (const entries of queue._q) {
      for (const entry of entries) {
        head.push(entry)
      }
    }
    head.dirty = true
    head.render()
  }

  win[streamKey] = {
    _q: queue?._q || [],
    _head: head,
    _hydrationLocked: () => hydrationLocked,
    // Server pushes arrays of entries (from inline scripts during streaming)
    push: (entries: any[]) => {
      // During hydration, only SSR streaming scripts should push
      // Client useHead calls are skipped to preserve streamed state
      for (const entry of entries) {
        head.push(entry)
      }
      head.dirty = true
      head.render()
    },
  }

  return head
}

init()

export { init }
