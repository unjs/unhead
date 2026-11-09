import type { HookableCore } from 'hookable'
import type { ClientUnhead } from '../client/adapter'
import type { ClientHeadHooks, CreateClientHeadOptions, HeadEntry, HeadPluginInput, HeadRenderer, ResolvableHead } from '../types'
import { createClientHeadAdapter } from '../client/adapter'
import { createUnhead } from '../unhead'

export type { ClientUnhead } from '../client/adapter'

export interface CreateLazyHeadOptions extends CreateClientHeadOptions {
  /**
   * Plugins that load with the runtime, so their code stays out of the eager chunk.
   */
  lazyPlugins?: () => Promise<HeadPluginInput[]>
  /**
   * Framework adapters return true when the current `head.push` cannot be in the
   * server rendered head. During hydration, such a push loads the runtime at once.
   */
  isClientOnlyPush?: () => boolean
  /**
   * Called when the runtime fails to load. The default logs with `console.error`.
   * A later change or `load()` tries again, but a browser may keep a failed `import()`
   * for this page. Use this to recover, for example with a reload on the next navigation.
   */
  onLoadError?: (error: unknown) => void
}

export interface LazyUnhead<T = ResolvableHead> extends ClientUnhead<T> {
  /**
   * Loads the runtime now. Safe to call more than once.
   * Resolves `false` if the load failed, and `onLoadError` receives the error.
   */
  load: () => Promise<boolean>
  /**
   * Blocks the load while the user changes page.
   * The next `head.render()` releases it, and loads at once if entries changed.
   * So call `head.render()` when the navigation ends, even if it aborted.
   * A direct `load()` still runs. A load already in flight finishes, and its first render
   * waits for that next `head.render()`.
   */
  blockLoad: () => void
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
 * Creates a client head for a server rendered page. It keeps entries without
 * touching the document. It loads the DOM runtime only when a change must reach
 * the document, or when `load()` runs.
 *
 * Use `createHead` from `unhead/client` for a page with no server rendered head.
 *
 * @experimental The lazy head API may change in a future minor release.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createLazyHead<T = ResolvableHead>(options: CreateLazyHeadOptions = {}): LazyUnhead<T> {
  const document = options.document || (typeof window !== 'undefined' ? window.document : undefined)
  const hooks = createHookStore(options.hooks)
  // Keep server inputs separate from live entries throughout hydration.
  const hydrationEntries = new Map<number, HeadEntry<T>>()
  let hydrationChanged = false
  let hydrated: HeadEntry<T>[] | undefined
  let loading: Promise<boolean> | undefined
  let blocked = false
  // blockLoad ran while a load was in flight, so its first render waits for the release
  let held = false
  let render: HeadRenderer<any>

  const head = createClientHeadAdapter<T>(
    createUnhead<T, boolean>(() => false, { document, propResolvers: options.propResolvers, init: [] }),
    hooks as unknown as HookableCore<ClientHeadHooks>,
    h => render(h),
  ) as LazyUnhead<T>
  // the adapter renders on every change unless batching, so changes reach `onChange` only
  head._b = true

  const markHydrated = () => {
    if (!hydrated) {
      hydrated = [...hydrationEntries.values()]
      head.dirty = hydrationChanged
    }
  }

  // the documented pause for DOM updates also blocks the load: nothing could render yet
  const isPaused = () => {
    const ctx = { shouldRender: true, tags: [] }
    hooks.callHook('dom:beforeRender', ctx)
    return !ctx.shouldRender
  }

  // During hydration a push is a page entry the server rendered, unless the adapter says
  // otherwise. A patch or dispose means the client already differs from the server. Both
  // need the runtime now. After hydration, every change loads unless a load block or pause stops it.
  let pushing = false
  const onChange = () => {
    if (!hydrated && !pushing)
      hydrationChanged = true
    if (hydrated ? !blocked && !isPaused() : !pushing)
      head.load()
  }
  const push = head.push
  head.push = (input, entryOptions) => {
    const serverRendered = !options.isClientOnlyPush?.()
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
    if (!hydrated && serverRendered && !hydrationEntries.has(active._i)) {
      const entry = head.entries.get(active._i)
      if (entry)
        hydrationEntries.set(active._i, { ...entry })
    }
    return active
  }

  head.load = () => loading ||= import('./runtime')
    .then(runtime => runtime.upgradeHead(head, options, () => hydrated || [...hydrationEntries.values()]))
    .then((renderer) => {
      // the runtime adopts these at its first render
      hydrated ||= [...hydrationEntries.values()]
      hydrationEntries.clear()
      hooks.removeHook('entries:updated', onChange)
      // While held, the head keeps batching, so a change waits for the render that releases it.
      render = held
        ? (h) => {
            held = false
            render = renderer
            head._b = false
            return renderer(h)
          }
        : renderer
      if (!held) {
        head._b = false
        head.render()
      }
      return true
    })
    // a failed first render takes the same path as a failed import, so a later load retries
    .catch((error) => {
      loading = undefined
      ;(options.onLoadError || console.error)(error)
      return false
    })

  head.blockLoad = () => {
    markHydrated()
    blocked = true
    held = !!loading && !!head._b
  }

  // Frameworks call this when hydration ends, and again when a paused page is ready.
  // After hydration the server head is correct, so only a change loads the runtime.
  render = () => {
    blocked = held = false
    if (hydrated && head.dirty)
      onChange()
    else
      markHydrated()
    return false
  }

  hooks.hook('entries:updated', onChange)
  options.plugins?.forEach(p => head.use(p))
  options.init?.forEach(e => e && head.push(e as T))
  return head
}
