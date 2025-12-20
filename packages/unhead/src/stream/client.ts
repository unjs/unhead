import type { CreateStreamableClientHeadOptions, ResolvableHead, SerializableHead } from '../types'
import { createHead } from '../client/createHead'

export * from '../client'

export interface UnheadStreamQueue {
  _q: SerializableHead[]
  push: (entry: SerializableHead) => void
}

export const DEFAULT_STREAM_KEY = '__unhead__'

/**
 * Creates a client head instance that consumes streaming SSR queue.
 * Must use matching streamKey from server's createStreamableHead.
 */
export function createStreamableHead<T = ResolvableHead>(options: CreateStreamableClientHeadOptions = {}) {
  const { streamKey = DEFAULT_STREAM_KEY, ...rest } = options

  // Get window from document or global
  const doc = rest.document || (typeof document !== 'undefined' ? document : undefined)
  const win = doc?.defaultView as any

  // Check for existing instance to adopt (from virtual module)
  const existing = win?.[streamKey]?._head
  if (existing) {
    return existing
  }

  // Create fresh instance
  const head = createHead<T>({ ...rest, document: doc })

  if (!win) {
    return head // No window, just return the head (SSR or non-browser)
  }

  // Consume streaming queue if present
  const streamQueue = win[streamKey] as UnheadStreamQueue | undefined
  if (streamQueue) {
    const queue = streamQueue._q || []
    queue.forEach(entry => head.push(entry as T))
  }

  // Replace queue with direct push to head instance (or create if not present)
  win[streamKey] = {
    _q: [],
    push: (entry: SerializableHead) => head.push(entry as T),
    _head: head,
  }

  return head
}

export type { CreateStreamableClientHeadOptions, Unhead } from '../types'
