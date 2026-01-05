/**
 * Client-side HeadStream - returns null (script already executed during SSR streaming)
 */
export function HeadStream(): null {
  return null
}

export {
  type CreateStreamableClientHeadOptions,
  createStreamableHead,
  type UnheadStreamQueue,
} from 'unhead/stream/client'
