export { UnheadContext } from '../context'

/**
 * Client-side HeadStream - returns null (script already executed during SSR streaming)
 */
export function HeadStream(): null {
  return null
}

export {
  type CreateStreamableClientHeadOptions,
  createStreamableHead,
  type StreamingGlobal,
  type UnheadStreamQueue,
} from 'unhead/stream/client'
