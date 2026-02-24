/**
 * Client-side HeadStream - returns empty string (script already executed during SSR streaming)
 */
export function HeadStream(): string {
  return ''
}

export { UnheadContextKey } from '../context'

export {
  type CreateStreamableClientHeadOptions,
  createStreamableHead,
  type UnheadStreamQueue,
} from 'unhead/stream/client'
