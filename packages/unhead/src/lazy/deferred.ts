import type { ClientHeadHooks, ResolvableHead } from '../types'
import type { HeadQueue, LazyHeadOptions, LazyUnhead } from './index'
import { createHooks } from '../utils/hooks'
import { pushQueuedEntry } from './push'

export type DeferredHead<T> = Pick<LazyUnhead<T>, 'push' | 'use' | 'ssr' | 'hooks' | 'resolvedOptions' | '_scripts' | '_dom'>

export interface DeferredHeadLifecycle {
  /** Mark queued entries as hydrated, then let the framework schedule the load. */
  finishHydration: (schedule: (load: () => Promise<void>) => void) => void
  discardStream: () => void
  render: () => void
}

/** @internal */
export function createDeferredHead<T = ResolvableHead, R = DeferredHead<T>>(
  options: LazyHeadOptions,
  install: (head: DeferredHead<T>, finishHydration: DeferredHeadLifecycle['finishHydration'], queue: HeadQueue<T>) => R,
): R {
  const queue: HeadQueue<T> = { index: 1, hydrating: true, entries: new Map(), plugins: [] }
  const head: DeferredHead<T> = {
    ssr: false,
    hooks: options.hookable ?? createHooks<ClientHeadHooks>(),
    resolvedOptions: { document: options.document ?? globalThis.document },
    use: (plugin) => { queue.plugins.push(plugin) },
    push(input, entryOptions) {
      return queue.head ? queue.head.push(input, entryOptions) : pushQueuedEntry(queue, options, input, entryOptions)
    },
  }
  options.init?.forEach(input => input && head.push(input as T))
  return install(head, (schedule) => {
    if (queue.hydrating) {
      queue.hydrating = false
      schedule(() => import('./runtime').then(({ hydrate }) => hydrate(options, queue, head)))
    }
  }, queue)
}

export function deferredHeadLifecycle<T>(finishHydration: DeferredHeadLifecycle['finishHydration'], queue: HeadQueue<T>): DeferredHeadLifecycle {
  return {
    finishHydration,
    discardStream() {
      const close = queue.closeStream
      queue.closeStream = false
      if (close)
        close()
    },
    render() { queue.head?.render() },
  }
}
