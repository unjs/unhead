/**
 * Client-side HeadStream - returns null (script already executed during SSR streaming)
 */
export function HeadStream(): null {
  return null
}

export {
  type CreateStreamableClientHeadOptions,
  createStreamableHead,
  DEFAULT_STREAM_KEY,
  type UnheadStreamQueue,
} from 'unhead/stream/client'
