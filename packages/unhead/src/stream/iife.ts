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
import { attachStreamHead } from './queue'

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

  const stream = win[streamKey] = queue || { _q: [] }
  attachStreamHead(stream, head)
  return head
}

export { init }
