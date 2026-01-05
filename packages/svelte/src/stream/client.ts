import type { ClientUnhead } from 'unhead/client'
import type { CreateStreamableClientHeadOptions } from 'unhead/stream/client'
import { createStreamableHead as _createStreamableHead } from 'unhead/stream/client'

export { UnheadContextKey } from '../context'

/**
 * Client-side HeadStream - returns empty string (script already executed during SSR streaming)
 */
export function HeadStream(): string {
  return ''
}

/**
 * Creates a client head by wrapping the core instance from the iife script.
 */
export function createStreamableHead(options: CreateStreamableClientHeadOptions = {}): ClientUnhead | undefined {
  return _createStreamableHead(options)
}

export { type CreateStreamableClientHeadOptions, DEFAULT_STREAM_KEY, type UnheadStreamQueue } from 'unhead/stream/client'
export type { Unhead } from 'unhead/types'
