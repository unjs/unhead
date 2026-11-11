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
   * When the client runtime loads on a server rendered page.
   * - `'change'`: on the first head change after hydration. The default.
   * - `'idle'`: at browser idle after hydration, so client only tags apply without a change.
   */
  load?: 'change' | 'idle'
  /**
   * Plugins that load with the runtime, so their code stays out of the eager chunk.
   */
  lazyPlugins?: () => Promise<HeadPluginInput[]>
  /**
   * Called when the runtime fails to load or its first render throws. The default logs with `console.error`.
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
   * The default renderer renders first after this resolves. If that render throws,
   * `onLoadError` receives the error, and a later change or `load()` tries again.
   */
  load: () => Promise<boolean>
  /**
   * Blocks the load while the user changes page.
   * The next `head.render()` releases it, and loads at once if entries changed.
   * So call `head.render()` when the navigation ends, even if it aborted.
   * A direct `load()` still runs. A load already in flight finishes, and its first render
   * waits for that next `head.render()`. An idle load during the block waits the same way.
   */
  blockLoad: () => void
}

type HookFn = (...args: any[]) => any

// the id offset of a late entry copy: far above any entry id, within the 21 bits a tag position leaves
const LATE_ID = 1 << 20

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
 * at idle with `load: 'idle'`, or when `load()` runs.
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
  // Each version of an entry pushed or patched after hydration and before the load. A hydrating
  // page can push or patch while a pause holds, so the server may have rendered any of those versions.
  // The runtime adopts these as well, under ids of their own, so the hydrated entries stay.
  // A copy can also hold a change the document does not show yet, and it overrides a hydrated
  // entry with the same tags. So the runtime adopts the document twice: with the copies, then without.
  const late: HeadEntry<T>[] = []
  let hydrationChanged = false
  let hydrated: HeadEntry<T>[] | undefined
  let loading: Promise<boolean> | undefined
  let blocked = false
  // blockLoad ran while a load was in flight, so its first render waits for the release
  let held = false
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
      if (document && !loading) {
        if (options.load === 'idle') {
          const view = document.defaultView as (Window & typeof globalThis) | null
          ;(view?.requestIdleCallback || setTimeout)(() => {
            // During a load block, the idle load renders first at the release, as a load in flight does
            if (!loading)
              held = blocked
            head.load()
          })
        }
        // A dev aid: name each client tag that waits for the first change. The import is dead code in production.
        // eslint-disable-next-line node/prefer-global/process
        else if (process.env.NODE_ENV !== 'production') {
          import('./devCheck')
            .then(m => m.checkHydratedHead(head, document, useLazyPlugins, sources, () => !!loading))
            // the check is advisory: its failure, such as a failing lazy plugin loader, must not reject unhandled
            .catch(error => console.warn('[unhead] The lazy head dev check failed.', error))
        }
      }
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
    if (!hydrated && serverRendered && !hydrationEntries.has(active._i)) {
      const entry = head.entries.get(active._i)
      if (entry)
        hydrationEntries.set(active._i, { ...entry, input: copyInput(entry.input) })
    }
    // A reactive input resolves again on any dependency change, such as the route that the router
    // sets during hydration. Before a load, a patch to the same input changes nothing, so it loads nothing.
    // The check compares with a copy, because an app can edit the input object in place and patch with it.
    const patch = active.patch
    let last = copyInput(input)
    const keepLate = () => {
      const entry = head.entries.get(active._i)
      if (entry && hydrated && !loading)
        late.push({ ...entry, _i: LATE_ID + late.length, input: last, _pending: undefined, _tags: undefined })
    }
    keepLate()
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
          keepLate()
          patch(next)
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
          if (!hydrated && !loading && entry) {
            entry.input = last
          }
          else {
            keepLate()
            patch(next)
          }
        })
      }
    }
    return active
  }

  // Frameworks call this when hydration ends, and again when a paused page is ready.
  // After hydration the server head is correct, so only a change loads the runtime.
  const lazyRender: HeadRenderer<any> = () => {
    blocked = held = false
    if (hydrated && head.dirty)
      onChange()
    else
      markHydrated()
    return false
  }
  render = lazyRender

  // a failed first render takes the same path as a failed import, so a later change or load retries
  const fail = (error: unknown) => {
    loading = plugins = undefined
    // the first render threw after the upgrade began, so restore the lazy head
    if (!head._b) {
      head._b = true
      render = lazyRender
      hooks.hook('entries:updated', onChange)
    }
    ;(options.onLoadError || console.error)(error)
    return false
  }

  // The comparison passes to the runtime, so the eager and runtime chunks share no module.
  head.load = () => loading ||= import('./runtime')
    .then(runtime => runtime.upgradeHead(head, options, useLazyPlugins, () => {
      const server = [...(hydrated || hydrationEntries.values())]
      return late.length ? [[...server, ...late], server] : [server]
    }, fail, sameInput))
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
    .catch(fail)

  head.blockLoad = () => {
    markHydrated()
    blocked = true
    held = !!loading && !!head._b
  }

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
