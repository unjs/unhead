import type { StreamingGlobal } from '../stream/types'
import type { SerializableHead, Unhead } from '../types'
import { bindStreamHead } from '../stream/queue'

export function attachLazyStreamHead(
  queue: StreamingGlobal,
  head: Unhead<any>,
  push: (input: SerializableHead) => number | undefined,
) {
  const backlog = queue._q
  const { _head: previousHead, push: previousPush } = queue
  queue._q = []
  const replay = bindStreamHead(queue, head, push)
  const streamPush = queue.push
  try {
    if (backlog.length)
      replay(backlog)
  }
  catch (error) {
    // Activation retries with a fresh head. Keep patches enqueued by hooks as well.
    // A route exit replaces push and discards the stream.
    if (queue.push === streamPush) {
      queue._q = backlog
      queue.push = previousPush
    }
    queue._head = previousHead
    throw error
  }
}
