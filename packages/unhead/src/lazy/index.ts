import type { HookableCore } from 'hookable'
import type { ClientUnhead } from '../client/adapter'
import type { ClientHeadHooks, CreateClientHeadOptions, HeadEntry, HeadPluginInput, HeadRenderer, ResolvableHead } from '../types'
import { registerPlugin } from '../unhead'
import { copyInput, sameInput } from './same'

/**
 * @experimental
 */
export interface LazyHeadOptions extends CreateClientHeadOptions {
  /**
   * Connect to the matching SSR stream queue. The framework calls `load()` to activate rendering.
   */
  streamKey?: string
  /**
   * Plugins that load with the runtime, so their code stays out of the eager chunk.
   */
  lazyPlugins?: () => Promise<HeadPluginInput[]>
  /**
   * Called when the runtime fails to load. The default logs with `console.error`.
   * A later change or `load()` tries again, but a browser may keep a failed `import()`
   * for this page. Use this to recover, for example with a reload on the next navigation.
   */
  onLoadError?: (error: unknown) => void
}

/**
 * Options that only framework adapters set.
 *
 * @internal
 */
interface LazyHeadAdapterOptions {
  /**
   * Returns true when the current `head.push` cannot be in the server rendered head.
   * During hydration, such a push loads the runtime at once.
   */
  _isClientOnlyPush?: () => boolean
  /**
   * Names the code that pushes an entry, such as a component file. Only dev warnings read it.
   */
  _entrySource?: () => string | undefined
}

/**
 * @experimental
 */
export interface LazyUnhead<T = ResolvableHead> extends ClientUnhead<T> {
  /**
   * Loads the runtime now. Safe to call more than once.
   * Resolves `false` if the load failed, and `onLoadError` receives the error.
   */
  load: () => Promise<boolean>
}

type HookFn = (...args: any[]) => any

function runHooks(hooks: HookFn[], args: any[], start: number): any {
  for (let i = start; i < hooks.length; i++) {
    let result
    try {
      result = hooks[i](...args)
    }
    catch (error) {
      return Promise.reject(error)
    }
    if (result && typeof result.then === 'function')
      return Promise.resolve(result).then(() => runHooks(hooks, args, i + 1))
  }
}

// Matches the HookableCore contract that the head relies on, including `_hooks`.
// Keeps hookable out of both the eager and lazy chunks.
function createHookStore(initial?: Record<string, any>) {
  const _hooks: Record<string, HookFn[] | undefined> = {}
  const store = {
    _hooks,
    hook(name: string, fn: HookFn) {
      (_hooks[name] ||= []).push(fn)
      return () => store.removeHook(name, fn)
    },
    removeHook(name: string, fn: HookFn) {
      const hooks = _hooks[name]
      if (hooks) {
        const i = hooks.indexOf(fn)
        if (i !== -1)
          hooks.splice(i, 1)
        if (!hooks.length)
          _hooks[name] = undefined
      }
    },
    callHook(name: string, ...args: any[]) {
      const hooks = _hooks[name]
      // a copy, so a listener that unhooks during the call does not skip the next one
      return hooks && runHooks([...hooks], args, 0)
    },
  }
  for (const name in initial)
    store.hook(name, initial[name])
  return store
}

/**
 * Creates the lazy head, for a server rendered page. It keeps entries
 * without touching the document. It loads the v3 DOM runtime on the first head change,
 * or when `load()` runs.
 *
 * Use `createHead` from `unhead/client` for a page with no server rendered head.
 *
 * @experimental The lazy head API may change in a future minor release.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead<T = ResolvableHead>(options: LazyHeadOptions = {}): LazyUnhead<T> {
  const adapter = options as LazyHeadAdapterOptions
  const document = options.document || (typeof window !== 'undefined' ? window.document : undefined)
  const streamKey = options.streamKey
  const streaming = streamKey !== undefined
  const hooks = createHookStore(options.hooks)
  // Copies of the server rendered entries, kept apart from live entries throughout hydration
  let serverEntries: HeadEntry<T>[] = []
  let hydrationChanged = false
  let hydrated: HeadEntry<T>[] | undefined
  let loading: Promise<boolean> | undefined
  let render: HeadRenderer<any>
  let plugins: Promise<void> | undefined
  const sources: Record<number, string | undefined> = {}

  // The head of `createUnhead` and `createClientHeadAdapter`, built in place: one push wrapper
  // tells the lazy head at once whether a change needs the runtime. Keep the two in step.
  const entries = new Map<number, HeadEntry<T>>()
  const head = {
    _entryCount: 1,
    _h: 0,
    plugins: new Map(),
    resolvedOptions: { document, propResolvers: options.propResolvers },
    ssr: false,
    entries,
    hooks: hooks as unknown as HookableCore<ClientHeadHooks>,
    dirty: false,
    // the runtime renders each change after the load, unless batching
    _b: true,
    render: () => render(head),
    use: (p: HeadPluginInput) => registerPlugin(head, p),
  } as unknown as LazyUnhead<T>

  // the lazy plugins register once, for the runtime or the dev check, whichever runs first
  const useLazyPlugins = () => plugins ||= Promise.resolve(options.lazyPlugins?.()).then((list) => {
    list?.forEach(p => head.use(p))
  }).catch((error) => {
    plugins = undefined
    throw error
  })

  // During hydration a change means the client already differs from the server, so it loads
  // the runtime now. After hydration, a change loads unless the documented pause for DOM
  // updates holds it: nothing could render yet. A framework pauses during a navigation,
  // so the load waits for the next page.
  const change = () => {
    if (streaming)
      return
    if (!hydrated)
      hydrationChanged = true
    const ctx = { shouldRender: true, tags: [] }
    if (hydrated)
      hooks.callHook('dom:beforeRender', ctx)
    if (ctx.shouldRender)
      head.load()
  }
  // Render here because an async hook listener could break batching.
  const notify = (changed?: boolean) => {
    head.dirty = true
    hooks.callHook('entries:updated', head)
    if (!head._b)
      head.render()
    else if (changed)
      change()
  }
  head.invalidate = () => {
    for (const entry of head.entries.values())
      delete entry._tags
    notify(true)
  }

  head.push = (input, entryOptions) => {
    const unhook = entryOptions?.onRendered
      ? hooks.hook('dom:rendered', entryOptions.onRendered as any)
      : undefined
    // During hydration a push is a page entry the server rendered, unless the adapter says otherwise.
    const serverRendered = !hydrated && !adapter._isClientOnlyPush?.()
    const _i = entryOptions?._index ?? head._entryCount++
    const { head: _head, onRendered: _onRendered, _index, ...entryOpts } = entryOptions || {}
    const entry: HeadEntry<T> = { _i, input, options: entryOpts, _o: input }
    entries.set(_i, entry)
    // A reactive input resolves again on any dependency change, such as the route that the router
    // sets during hydration. Before a load, a patch to the same input changes nothing, so it loads nothing.
    // The check compares with a copy, because an app can edit the input object in place and patch with it.
    let last = copyInput(input, serverRendered && !options.render)
    const server = serverRendered ? { ...entry, input: last } : undefined
    if (server)
      serverEntries.push(server)
    // eslint-disable-next-line node/prefer-global/process
    if (process.env.NODE_ENV !== 'production' && adapter._entrySource)
      sources[_i] ||= adapter._entrySource()
    notify(!serverRendered)
    const update = (next: T) => {
      entry._pending = next
      // a patch after dispose adds the entry again
      entries.set(_i, entry)
      notify(true)
    }
    let lastRef = input
    let queued = false
    return {
      _i,
      patch(next) {
        if (loading || !head.entries.has(_i)) {
          lastRef = next
          update(next)
        }
        else if (next !== lastRef) {
          lastRef = next
          if (!sameInput(last, next)) {
            last = copyInput(next)
            update(next)
          }
          // The entry takes the equal object with no change, so a later in-place edit to it renders
          else if (entry._pending !== undefined) {
            entry._pending = next
          }
          else {
            entry.input = next
          }
        }
        // The same object, edited in place, as Nuxt's `<Link>` does in its render. Reading it now
        // would make that render depend on it, so the check waits for a microtask.
        else if (!queued) {
          queued = true
          queueMicrotask(() => {
            queued = false
            // a patch with another object since then is newer, so this edit must not overwrite it
            if (next !== lastRef || !head.entries.has(_i) || sameInput(last, next))
              return
            // During hydration, a component that builds its input in place renders what the server rendered
            const inPlaceServerEntry = !hydrated && !loading && server
            last = copyInput(next, !!inPlaceServerEntry && !options.render)
            if (inPlaceServerEntry)
              inPlaceServerEntry.input = last
            else
              update(next)
          })
        }
      },
      dispose() {
        unhook?.()
        if (head.entries.has(_i)) {
          entries.delete(_i)
          head.invalidate()
        }
      },
    }
  }

  // Frameworks call this when hydration ends, and again when a paused page is ready.
  // After hydration the server head is correct, so only a change loads the runtime.
  render = () => {
    if (hydrated) {
      if (head.dirty)
        change()
    }
    else {
      hydrated = serverEntries
      head.dirty = hydrationChanged
      // A dev aid: name each client tag that waits for the first change. The import is dead code in production.
      // eslint-disable-next-line node/prefer-global/process
      if (process.env.NODE_ENV !== 'production' && document && !loading && !streaming) {
        import('./devCheck')
          .then(m => m.checkHydratedHead(head, document, useLazyPlugins, sources, () => !!loading))
          // the check is advisory: its failure, such as a failing lazy plugin loader, must not reject unhandled
          .catch(error => console.warn('[unhead] The lazy head dev check failed.', error))
      }
    }
    return false
  }

  head.load = () => {
    // A load before hydration ends that no change started means no server head applies: a page
    // with no server render, or a head created after hydration. Nothing is left to adopt, so the
    // first render takes the entries as they are then, as the default client head does.
    if (!streaming && !hydrated && !loading && !hydrationChanged)
      hydrated = serverEntries = []
    // The runtime and the lazy plugins load together, so the first change waits one round trip.
    return loading ||= Promise.all([import('./runtime'), useLazyPlugins()])
      .then(([runtime]) => {
        render = runtime.upgradeHead(head, options, () => hydrated ||= serverEntries, streamKey)
        head._b = false
        head.render()
        return true
      })
      // a failed load resets, so a later change or `load()` retries
      .catch((error) => {
        loading = undefined
        ;(options.onLoadError || console.error)(error)
        return false
      })
  }

  // `useScript` writes its script only once the runtime renders it
  hooks.hook('script:updated', ({ script }: { script: { status: string } }) => {
    if (!streaming && script.status === 'loading')
      head.load()
  })
  options.plugins?.forEach(p => head.use(p))
  options.init?.forEach(e => e && head.push(e as T))
  return head
}
