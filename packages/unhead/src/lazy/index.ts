import type { HookableCore } from 'hookable'
import type { ClientUnhead } from '../client/adapter'
import type { ClientHeadHooks, CreateClientHeadOptions, HeadEntry, HeadPluginInput, HeadRenderer, ResolvableHead } from '../types'
import { createClientHeadAdapter } from '../client/adapter'
import { createUnhead } from '../unhead'
import { copyInput, sameInput } from './same'

/**
 * @experimental
 */
export interface LazyHeadOptions extends CreateClientHeadOptions {
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
  const hooks = createHookStore(options.hooks)
  // Keep server inputs separate from live entries throughout hydration.
  const hydrationEntries = new Map<number, HeadEntry<T>>()
  let hydrationChanged = false
  let hydrated: HeadEntry<T>[] | undefined
  let loading: Promise<boolean> | undefined
  let render: HeadRenderer<any>
  let plugins: Promise<void> | undefined
  const sources: Record<number, string | undefined> = {}

  const head = createClientHeadAdapter<T>(
    createUnhead<T, boolean>(() => false, { document, propResolvers: options.propResolvers, init: [] }),
    hooks as unknown as HookableCore<ClientHeadHooks>,
    h => render(h),
  ) as LazyUnhead<T>
  // the adapter renders on every change unless batching, so changes reach `onChange` only
  head._b = true

  // the lazy plugins register once, for the runtime or the dev check, whichever runs first
  const useLazyPlugins = () => plugins ||= Promise.resolve(options.lazyPlugins?.()).then((list) => {
    list?.forEach(p => head.use(p))
  })

  const markHydrated = () => {
    if (!hydrated) {
      hydrated = [...hydrationEntries.values()]
      head.dirty = hydrationChanged
      // A dev aid: name each client tag that waits for the first change. The import is dead code in production.
      // eslint-disable-next-line node/prefer-global/process
      if (process.env.NODE_ENV !== 'production' && document && !loading) {
        import('./devCheck')
          .then(m => m.checkHydratedHead(head, document, useLazyPlugins, sources, () => !!loading))
          // the check is advisory: its failure, such as a failing lazy plugin loader, must not reject unhandled
          .catch(error => console.warn('[unhead] The lazy head dev check failed.', error))
      }
    }
  }

  // The documented pause for DOM updates also holds the load: nothing could render yet.
  // A framework pauses during a navigation, so the load waits for the next page.
  const isPaused = () => {
    const ctx = { shouldRender: true, tags: [] }
    hooks.callHook('dom:beforeRender', ctx)
    return !ctx.shouldRender
  }

  // During hydration a push is a page entry the server rendered, unless the adapter says
  // otherwise. A patch or dispose means the client already differs from the server. Both
  // need the runtime now. After hydration, every change loads unless a pause holds it.
  let pushing = false
  const onChange = () => {
    if (!hydrated && !pushing)
      hydrationChanged = true
    if (hydrated ? !isPaused() : !pushing)
      head.load()
  }
  const push = head.push
  head.push = (input, entryOptions) => {
    const serverRendered = !adapter._isClientOnlyPush?.()
    // a hook may push inside this push, so restore the outer value, even if the push throws
    const outer = pushing
    pushing = serverRendered
    let active: ReturnType<typeof push>
    try {
      active = push(input, entryOptions)
    }
    finally {
      pushing = outer
    }
    // eslint-disable-next-line node/prefer-global/process
    if (process.env.NODE_ENV !== 'production' && adapter._entrySource)
      sources[active._i] ||= adapter._entrySource()
    // A reactive input resolves again on any dependency change, such as the route that the router
    // sets during hydration. Before a load, a patch to the same input changes nothing, so it loads nothing.
    // The check compares with a copy, because an app can edit the input object in place and patch with it.
    let last = copyInput(input)
    if (!hydrated && serverRendered && !hydrationEntries.has(active._i)) {
      const entry = head.entries.get(active._i)
      // the hydrated entry reuses the copy when the entry holds the pushed input
      if (entry)
        hydrationEntries.set(active._i, { ...entry, input: entry.input === input ? last : copyInput(entry.input) })
    }
    const patch = active.patch
    let lastRef = input
    let queued = false
    active.patch = (next) => {
      if (loading || !head.entries.has(active._i)) {
        lastRef = next
        patch(next)
      }
      else if (next !== lastRef) {
        lastRef = next
        if (!sameInput(last, next)) {
          last = copyInput(next)
          patch(next)
        }
        else {
          // The entry takes the equal object with no change, so a later in-place edit to it renders
          const entry = head.entries.get(active._i)!
          if (entry._pending !== undefined)
            entry._pending = next
          else
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
          if (next !== lastRef || !head.entries.has(active._i) || sameInput(last, next))
            return
          last = copyInput(next)
          const entry = hydrationEntries.get(active._i)
          // During hydration, a component that builds its input in place renders what the server rendered
          if (!hydrated && !loading && entry)
            entry.input = last
          else
            patch(next)
        })
      }
    }
    return active
  }

  // Frameworks call this when hydration ends, and again when a paused page is ready.
  // After hydration the server head is correct, so only a change loads the runtime.
  render = () => {
    if (hydrated && head.dirty)
      onChange()
    else
      markHydrated()
    return false
  }

  head.load = () => loading ||= import('./runtime')
    .then(runtime => runtime.upgradeHead(head, options, useLazyPlugins, () => hydrated!))
    .then((renderer) => {
      // the runtime adopts these at its first render, which runs after this
      hydrated ||= [...hydrationEntries.values()]
      hydrationEntries.clear()
      hooks.removeHook('entries:updated', onChange)
      render = renderer
      head._b = false
      head.render()
      return true
    })
    // a failed load resets, so a later change or `load()` retries
    .catch((error) => {
      loading = plugins = undefined
      ;(options.onLoadError || console.error)(error)
      return false
    })

  hooks.hook('entries:updated', onChange)
  // `useScript` writes its script only once the runtime renders it
  hooks.hook('script:updated', ({ script }: { script: { status: string } }) => {
    if (script.status === 'loading')
      head.load()
  })
  options.plugins?.forEach(p => head.use(p))
  options.init?.forEach(e => e && head.push(e as T))
  return head
}
