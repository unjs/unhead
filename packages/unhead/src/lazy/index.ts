import type { ClientUnhead } from '../client/adapter'
import type { ActiveHeadEntry, CreateClientHeadOptions, HeadEntry, HeadEntryOptions, HeadPluginInput, ResolvableHead } from '../types'
import { copyInput } from './same'

/**
 * @experimental
 */
export interface LazyHeadOptions extends CreateClientHeadOptions {
  /** Connect to the matching SSR stream queue when the framework calls `load()`. */
  streamKey?: string
  /** Load plugins with the runtime to keep them out of the initial bundle. */
  lazyPlugins?: () => Promise<HeadPluginInput[]>
  /** Hook registry for framework integrations that subscribe before activation. */
  hookable?: ClientUnhead['hooks']
  /**
   * Name the component that pushed an entry for dev warnings.
   * @internal
   */
  _entrySource?: () => string | undefined
}

/**
 * @experimental
 */
export interface LazyUnhead<T = ResolvableHead> extends Pick<ClientUnhead<T>, 'ssr' | 'push' | 'use' | 'resolvedOptions' | '_scripts' | '_dom'> {
  /** Available before activation if supplied by the framework or created by Vue's useScript. */
  hooks?: ClientUnhead<T>['hooks']
  /** Resolved entries are available once the runtime starts replaying the queue. */
  readonly entries: Map<number, HeadEntry<T>>
  /** Stop recording which entries came from hydration. */
  finishHydration: () => void
  /** Discard streamed patches from the initial page when the framework leaves it. */
  discardStream: () => void
  /** Render if the runtime is active. */
  render: () => boolean
  /** Load the runtime and return the client head. Concurrent calls share one load. */
  load: () => Promise<ClientUnhead<T>>
}

/** @internal */
export interface QueuedEntry<T> {
  input: T
  hydrated?: boolean
  options?: HeadEntryOptions
  baseline?: { input: T }
  disposed?: boolean
  active?: ActiveHeadEntry<T>
  source?: string
}

/** @internal */
export interface HeadQueue<T> {
  index: number
  hydrating: boolean
  entries: Map<number, QueuedEntry<T>>
  plugins: HeadPluginInput[]
  closeStream?: false | (() => void)
  head?: ClientUnhead<T>
}

/**
 * Create a shell for a server-rendered page. The framework chooses when to load
 * the client head and apply queued client entries and streamed patches.
 *
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead<T = ResolvableHead>(options: LazyHeadOptions = {}): LazyUnhead<T> {
  const queue: HeadQueue<T> = { index: 1, hydrating: true, entries: new Map(), plugins: [] }
  let active: ClientUnhead<T> | undefined
  let loading: Promise<ClientUnhead<T>> | undefined
  let emptyEntries: Map<number, HeadEntry<T>> | undefined

  const shell: LazyUnhead<T> = {
    ssr: false,
    hooks: options.hookable,
    resolvedOptions: { document: options.document ?? globalThis.document },
    get entries() { return queue.head?.entries ?? (emptyEntries ||= new Map()) },
    finishHydration() {
      if (!queue.hydrating)
        return
      queue.hydrating = false
      // eslint-disable-next-line node/prefer-global/process
      if (process.env.NODE_ENV !== 'production' && !loading && options.streamKey === undefined) {
        import('./devCheck')
          .then(({ checkHydratedHead }) => !loading && checkHydratedHead(options, queue))
          .catch(error => console.warn('[unhead] The lazy head dev check failed.', error))
      }
    },
    discardStream() {
      const close = queue.closeStream
      queue.closeStream = false
      if (close)
        close()
    },
    use(plugin) {
      if (active)
        active.use(plugin)
      else
        queue.plugins.push(plugin)
    },
    render: () => active?.render() ?? false,
    push(input, entryOptions) {
      if (active)
        return active.push(input, entryOptions)
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
        patch(next) {
          if (!queue.hydrating)
            entry.hydrated = false
          // A component may populate the same object during its hydration render.
          // Read it outside the render so Vue does not subscribe to that input.
          const baseline = entry.baseline
          if (baseline && queue.hydrating && next === entry.input) {
            queueMicrotask(() => {
              if (entry.input === next && !entry.disposed && !entry.active)
                baseline.input = copyInput(next)
            })
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
    },
    load() {
      return loading ||= active
        ? Promise.resolve(active)
        : import('./runtime')
            .then(({ activate }) => activate(options, queue, shell, (head) => {
              active = head
              queue.entries.clear()
              queue.plugins.length = 0
            }))
            .catch((error) => {
              loading = undefined
              throw error
            })
    },
  }

  options.init?.forEach(input => input && shell.push(input as T))
  return shell
}
