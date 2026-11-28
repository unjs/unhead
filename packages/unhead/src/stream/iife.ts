/**
 * Streaming IIFE client - minimal self-contained bundle for immediate DOM updates during HTML streaming.
 *
 * Uses the core unhead without hooks/plugins for minimal bundle size.
 *
 * @module unhead/stream/iife
 */
import type { HeadRenderer } from '../types'
import type { StreamingGlobal } from './types'
import { createDomRenderer, renderStreamingDOMHead } from '../client/renderDOMHead'
import { createUnhead } from '../unhead'
import { attachStreamHead } from './queue'

const DEFAULT_STREAM_KEY = '__unhead__'

interface StreamingOptions {
  streamKey?: string
}

function initStreamingHead(render: HeadRenderer<boolean>, options: StreamingOptions = {}) {
  const { streamKey = DEFAULT_STREAM_KEY } = options
  const win = typeof window !== 'undefined' ? window as any : undefined
  if (!win)
    return

  const queue = win[streamKey] as StreamingGlobal | undefined
  if (queue?._head)
    return queue._head

  const doc = typeof document !== 'undefined' ? document : undefined
  const head = createUnhead(render, { document: doc })

  const stream = win[streamKey] = queue || { _q: [] }
  attachStreamHead(stream, head)
  return head
}

export function init(options?: StreamingOptions) {
  return initStreamingHead(createDomRenderer(), options)
}

export function initWithDeferredEvents(options?: StreamingOptions) {
  return initStreamingHead(renderStreamingDOMHead, options)
}
