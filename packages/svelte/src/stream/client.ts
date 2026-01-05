/**
 * Client-side HeadStream - returns empty string (script already executed during SSR streaming)
 */
export function HeadStream(): string {
  return ''
}

export {
  type CreateStreamableClientHeadOptions,
  createStreamableHead,
  DEFAULT_STREAM_KEY,
  type UnheadStreamQueue,
} from 'unhead/stream/client'
