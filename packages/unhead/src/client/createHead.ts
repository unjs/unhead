import type { CreateClientHeadOptions, CreateStreamableClientHeadOptions, ResolvableHead, SerializableHead } from '../types'
import { createUnhead } from '../unhead'
import { renderDOMHead } from './renderDOMHead'

interface UnheadStreamQueue {
  _q: SerializableHead[]
  push: (entry: SerializableHead) => void
}

const DEFAULT_STREAM_KEY = '__unhead__'

export function createHead<T = ResolvableHead>(options: CreateClientHeadOptions = {}) {
  const render = options.domOptions?.render || renderDOMHead
  options.document = options.document || (typeof window !== 'undefined' ? document : undefined)
  const initialPayload = options.document?.head.querySelector('script[id="unhead:payload"]')?.innerHTML || false
  const streamKey = options.experimentalStreamKey || DEFAULT_STREAM_KEY

  // restore initial entry from payload (titleTemplate and templateParams)
  const head = createUnhead<T>({
    ...options,
    plugins: [
      ...(options.plugins || []),
      {
        key: 'client',
        hooks: {
          'entries:updated': render,
        },
      },
    ],
    init: [
      initialPayload ? JSON.parse(initialPayload) : false,
      ...(options.init || []),
    ],
  })

  // Consume streaming queue if present
  const win = options.document?.defaultView || (typeof window !== 'undefined' ? window : undefined)
  if (win) {
    const streamQueue = (win as any)[streamKey] as UnheadStreamQueue | undefined
    if (streamQueue) {
      const queue = streamQueue._q || []
      // Process queued entries from streaming and track them for hydration adoption
      const streamEntries: ReturnType<typeof head.push>[] = []
      queue.forEach((entry) => {
        streamEntries.push(head.push(entry as T))
      })
      // Store streaming entries for React hydration to adopt (with index tracker)
      head._streamEntries = streamEntries
      head._streamIndex = { value: 0 }
      // Replace queue with direct push to head instance - also track live pushes for hydration
      ;(win as any)[streamKey] = {
        _q: [],
        push: (entry: SerializableHead) => {
          const activeEntry = head.push(entry as T)
          // Track live push entries for hydration adoption too
          head._streamEntries?.push(activeEntry)
        },
      }
    }
  }

  return head
}

/**
 * Creates a client head instance that consumes streaming SSR queue.
 * Must use matching streamKey from server's createStreamableHead.
 */
export function createStreamableHead<T = ResolvableHead>(options: CreateStreamableClientHeadOptions = {}) {
  const { streamKey, ...rest } = options
  return createHead<T>({
    ...rest,
    experimentalStreamKey: streamKey,
  })
}
