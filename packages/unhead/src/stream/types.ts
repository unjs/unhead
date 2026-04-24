import type { SerializableHead, Unhead } from '../types'

/**
 * Shape of the streaming queue written to `window[streamKey]` (default
 * `window.__unhead__`) by the server-emitted bootstrap script. The client
 * IIFE reads from it to replay queued entries, and the streaming client
 * wraps the resulting head instance.
 *
 * Both the server bootstrap (`createBootstrapScript`) and the client
 * (`createStreamableHead`, iife) must agree on this shape.
 */
export interface StreamingGlobal {
  /** Queued entry batches pushed before the client IIFE took over. */
  _q: SerializableHead[][]
  /** Resolved Unhead instance, populated once the IIFE initialises. */
  _head?: Unhead<any>
  /** True while framework hydration is in progress (client push suppression). */
  _hydrationLocked?: () => boolean
  /** Push an entry batch onto the queue (pre-init) or the head (post-init). */
  push: (entries: SerializableHead[]) => void
}

/**
 * @deprecated Use `StreamingGlobal` instead. Kept as an alias for back-compat.
 */
export type UnheadStreamQueue = StreamingGlobal
