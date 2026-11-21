import type { SerializableHead, Unhead } from '../types'
import type { StreamingGlobal } from './types'

/** @internal */
export function attachStreamHead(
  queue: Pick<StreamingGlobal, '_q'> & Partial<StreamingGlobal>,
  head: Unhead<any>,
  push: (input: SerializableHead) => number | undefined = input => head.push(input)._i,
): void {
  const backlog = queue._q
  queue._q = []
  queue._head = head
  let pending: SerializableHead[][] | undefined
  queue.push = (entries) => {
    if (pending) {
      pending.push(entries)
      return
    }
    pending = [entries]
    const batching = head._b
    head._b = true
    try {
      // Hooks can enqueue a patch during replay. Apply it after the existing backlog.
      for (const batch of pending) {
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
  if (backlog.length)
    queue.push(backlog.flat())
}
