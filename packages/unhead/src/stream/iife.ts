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

  // Push a batch of entries and render once. Without `_b` a client head
  // wrapper renders on every push, so an N-entry chunk costs N renders.
  function pushBatch(entries: any[]) {
    // Nested call (an `entries:updated` listener pushed again): stay inside the
    // outer batch so it still owns the single render.
    const nested = head._b
    head._b = true
    try {
      for (const entry of entries) {
        pushStreamed(entry)
      }
    }
    finally {
      head._b = nested
      // In the `finally` so a throwing entry still renders the ones that
      // landed before it, instead of leaving them pending indefinitely.
      if (!nested) {
        head.dirty = true
        head.render()
      }
    }
  }

  // Consume the backlog as one batch. Each item is an array of entries, and
  // the whole queue is worth a single render, not one per queued chunk.
  if (queue?._q?.length) {
    pushBatch(queue._q.flat())
  }

  win[streamKey] = {
    _q: queue?._q || [],
    _head: head,
    // Server pushes arrays of entries (from inline scripts during streaming)
    push: pushBatch,
  } satisfies StreamingGlobal

  return head
}

export { init }
