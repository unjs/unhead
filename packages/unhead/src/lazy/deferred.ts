import type { ResolvableHead } from '../types'
import type { HeadQueue, LazyHeadOptions, LazyUnhead } from './index'
import { pushQueuedEntry } from './push'

export type DeferredHead<T> = Pick<LazyUnhead<T>, 'push' | 'use' | 'ssr' | 'resolvedOptions' | '_scripts' | '_dom' | 'render'> & {
  hooks?: LazyUnhead<T>['hooks'] | SetupHooks
  _load?: () => Promise<void>
}

export interface DeferredHeadLifecycle {
  /** Mark queued entries as hydrated, then let the framework schedule the load. */
  finishHydration: (schedule: (load: () => Promise<void>) => void) => void
  discardStream: () => void
  render: () => void
}

/** @internal */
export function createDeferredHead<T = ResolvableHead>(
  options: LazyHeadOptions,
  resolveRef?: (value: unknown) => unknown,
) {
  const queue: HeadQueue<T> = { index: 1, hydrating: true, entries: new Map(), plugins: [] }
  const head: DeferredHead<T> = {
    ssr: false,
    hooks: options.hookable || setupHooks(),
    resolvedOptions: { document: options.document ?? globalThis.document },
    render: () => queue.head?.render() ?? false,
    use: plugin => queue.plugins.push(plugin),
    push(input, entryOptions) {
      return queue.head ? queue.head.push(input, entryOptions) : pushQueuedEntry(queue, options, input, entryOptions)
    },
  }
  head._load = () => import('./runtime').then(({ hydrate }) => hydrate(options, queue, head, resolveRef))
  options.init?.forEach(input => input && head.push(input as T))
  return [head, queue] as const
}

type SetupCallback = (...args: unknown[]) => unknown

function setupHooks() {
  return {
    _hooks: {} as Record<string, SetupCallback[]>,
    hook(name: string, callback?: SetupCallback) {
      const list = this._hooks[name] ||= []
      list.push(callback!)
      return () => {
        const index = list.indexOf(callback!)
        if (index !== -1)
          list.splice(index, 1)
        callback = undefined
      }
    },
  }
}

export type SetupHooks = ReturnType<typeof setupHooks>

export function deferredHeadLifecycle<T>(head: DeferredHead<T>, queue: HeadQueue<T>): DeferredHeadLifecycle {
  return {
    finishHydration(schedule) {
      if (queue.hydrating) {
        queue.hydrating = false
        const load = head._load
        if (load)
          schedule(load)
      }
    },
    discardStream() {
      const close = queue.closeStream
      queue.closeStream = false
      if (close)
        close()
    },
    render() { queue.head?.render() },
  }
}
