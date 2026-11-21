import type { ClientUnhead } from '../client/adapter'
import type { ActiveHeadEntry, CreateClientHeadOptions, HeadEntryOptions, HeadPluginInput, ResolvableHead } from '../types'
import { copyInput } from './same'

/**
 * @experimental
 */
export interface LazyHeadOptions extends CreateClientHeadOptions {
  /** Connect to the matching SSR stream queue when the framework calls `load()`. */
  streamKey?: string
  /** Load plugins with the runtime to keep them out of the initial bundle. */
  lazyPlugins?: () => Promise<HeadPluginInput[]>
  /**
   * Name the component that pushed an entry for dev warnings.
   * @internal
   */
  _entrySource?: () => string | undefined
}

/**
 * @experimental
 */
export interface LazyUnhead<T = ResolvableHead> {
  ssr: false
  push: (input: T, options?: HeadEntryOptions) => ActiveHeadEntry<T>
  use: (plugin: HeadPluginInput) => void
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
  entries: Map<number, QueuedEntry<T>>
  plugins: HeadPluginInput[]
  closeStream?: false | (() => void)
}

/**
 * Create a shell for a server-rendered page. The framework chooses when to load
 * the client head and apply queued client entries and streamed patches.
 *
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead<T = ResolvableHead>(options: LazyHeadOptions = {}): LazyUnhead<T> {
  const queue: HeadQueue<T> = { index: 1, entries: new Map(), plugins: [] }
  let hydrating = true
  let active: ClientUnhead<T> | undefined
  let loading: Promise<ClientUnhead<T>> | undefined

  const shell: LazyUnhead<T> = {
    ssr: false,
    finishHydration() {
      if (!hydrating)
        return
      hydrating = false
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
      const entry: QueuedEntry<T> = { input, options: entryOptions, hydrated: hydrating }
      if (hydrating && !options.render)
        entry.baseline = { input: copyInput(input) }
      // eslint-disable-next-line node/prefer-global/process
      if (process.env.NODE_ENV !== 'production')
        entry.source = options._entrySource?.()
      queue.entries.set(_i, entry)
      return {
        _i,
        patch(next) {
          if (!hydrating)
            entry.hydrated = false
          // A component may populate the same object during its hydration render.
          // Read it outside the render so Vue does not subscribe to that input.
          const baseline = entry.baseline
          if (baseline && hydrating && next === entry.input) {
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
      if (active && !loading)
        return Promise.resolve(active)
      return loading ||= import('./runtime')
        .then(({ activate }) => activate(options, queue, (head) => {
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
