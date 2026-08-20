/**
 * Streaming IIFE client - minimal self-contained bundle for immediate DOM updates during HTML streaming.
 *
 * Uses the core unhead without hooks/plugins for minimal bundle size.
 *
 * @module unhead/stream/iife
 */
import type { StreamingGlobal } from './types'
import { createDomRenderer } from '../client/renderDOMHead'
import { createUnhead } from '../unhead'

const DEFAULT_STREAM_KEY = '__unhead__'

function init(options: { streamKey?: string } = {}) {
  const { streamKey = DEFAULT_STREAM_KEY } = options
  const win = typeof window !== 'undefined' ? window as any : undefined
  if (!win)
    return

  const queue = win[streamKey] as StreamingGlobal | undefined
  if (queue?._head)
    return queue._head

  const doc = typeof document !== 'undefined' ? document : undefined
  const head = createUnhead(createDomRenderer(), { document: doc })

  // Push an entry and tag it as streamed so devtools can distinguish
  // entries that arrived via inline streaming scripts from client pushes.
  function pushStreamed(entry: any) {
    const active = head.push(entry)
    const stored = head.entries.get(active._i) as any
    if (stored)
      stored._streamed = true
  }

  // Push each streamed batch with one render.
  function pushBatch(entries: any[]) {
    // Let the outer batch own renders from nested pushes.
    const nested = head._b
    head._b = true
    try {
      for (const entry of entries) {
        pushStreamed(entry)
      }
    }
    finally {
      head._b = nested
      // Render accepted entries even when a later push throws.
      if (!nested) {
        head.dirty = true
        head.render()
      }
    }
  }

  // Consume the backlog with one render.
  if (queue?._q?.length) {
    pushBatch(queue._q.flat())
  }

  win[streamKey] = {
    // Drop the consumed queue to release streamed entries.
    _q: [],
    _head: head,
    // Server pushes arrays of entries (from inline scripts during streaming)
    push: pushBatch,
  } satisfies StreamingGlobal

  return head
}

export { init }
