import type { SerializableHead, Unhead } from '../types'
import type { StreamingGlobal } from './types'

/** @internal */
export function attachStreamHead(
  queue: Pick<StreamingGlobal, '_q'> & Partial<StreamingGlobal>,
  head: Unhead<any>,
  push: (input: SerializableHead) => number | undefined = input => head.push(input, { _streamed: true })._i,
): void {
  const backlog = queue._q
  const previousHead = queue._head
  const previousPush = queue.push
  let attaching = true
  queue._q = []
  queue._head = head
  let pending: SerializableHead[][] | undefined
  const streamPush: StreamingGlobal['push'] = (entries) => {
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
    catch (error) {
      // Activation retries with a fresh head. Retain the entire replay, including
      // patches received by hooks, until that head owns the queue successfully.
      if (attaching && queue.push === streamPush)
        queue._q = pending
      throw error
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
  queue.push = streamPush
  try {
    if (backlog.length)
      queue.push(backlog.flat())
  }
  catch (error) {
    // A route exit deliberately replaces push and must remain discarded.
    if (queue.push === streamPush) {
      queue.push = previousPush
    }
    queue._head = previousHead
    throw error
  }
  finally {
    attaching = false
  }
}
