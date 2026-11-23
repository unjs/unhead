import type { SerializableHead, Unhead } from '../types'
import type { StreamingGlobal } from './types'

export type StreamQueue = Pick<StreamingGlobal, '_q'> & Partial<StreamingGlobal>

export function bindStreamHead(
  queue: StreamQueue,
  head: Unhead<any>,
  push: (input: SerializableHead) => number | undefined = input => head.push(input, { _streamed: true })._i,
) {
  let pending: SerializableHead[][] | undefined
  function replay(batches: SerializableHead[][]) {
    pending = batches
    const batching = head._b
    head._b = true
    try {
      // Hooks can enqueue a patch during replay. Apply it after the existing backlog.
      for (const batch of batches) {
        for (const input of batch) {
          const id = push(input)
          const entry = id === undefined ? undefined : head.entries.get(id)
          if (entry)
            entry._streamed = true
        }
      }
    }
    finally {
      pending = undefined
      head._b = batching
      if (!batching) {
        head.dirty = true
        head.render()
      }
    }
  }
  queue._head = head
  queue.push = (entries) => {
    if (pending)
      pending.push(entries)
    else
      replay([entries])
  }
  return replay
}

/** @internal */
export function attachStreamHead(queue: StreamQueue, head: Unhead<any>) {
  const backlog = queue._q
  queue._q = []
  const replay = bindStreamHead(queue, head)
  if (backlog.length)
    replay(backlog)
}
