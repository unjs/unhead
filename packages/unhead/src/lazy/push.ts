import type { HeadEntryOptions } from '../types'
import type { HeadQueue, LazyHeadOptions, QueuedEntry } from './index'
import { copyInput } from './same'

export function pushQueuedEntry<T>(queue: HeadQueue<T>, options: LazyHeadOptions, input: T, entryOptions?: HeadEntryOptions) {
  const _i = entryOptions?._index ?? queue.index++
  const entry: QueuedEntry<T> = { input, options: entryOptions, hydrated: queue.hydrating }
  if (queue.hydrating && !options.render)
    entry.baseline = { input: copyInput(input) }
    // eslint-disable-next-line node/prefer-global/process
  if (process.env.NODE_ENV !== 'production')
    entry.source = options._entrySource?.()
  queue.entries.set(_i, entry)
  return {
    _i,
    patch(next: T) {
      if (queue.hydrating) {
        // Vue can populate the same object during hydration. Read it outside
        // render so the component does not subscribe to the snapshot.
        const baseline = entry.baseline
        if (baseline && next === entry.input) {
          queueMicrotask(() => {
            if (entry.input === next && !entry.disposed && !entry.active)
              baseline.input = copyInput(next)
          })
        }
      }
      else {
        entry.hydrated = false
      }
      entry.input = next
      entry.disposed = false
      entry.active?.patch(next)
    },
    dispose() {
      entry.disposed = true
      entry.active?.dispose()
    },
  }
}
