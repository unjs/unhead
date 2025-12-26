export { UnheadContext } from '../context'

/**
 * Client-side HeadStream - returns null (script already executed during SSR streaming)
 */
export function HeadStream(): null {
  return null
}

export * from 'unhead/stream/client'
