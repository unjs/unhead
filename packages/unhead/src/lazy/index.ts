import type { ClientUnhead } from '../client/adapter'
import type { CompiledTags } from '../compiled/types'
import type { ActiveHeadEntry, CreateClientHeadOptions, HeadEntry, HeadEntryOptions, HeadPlugin, HeadPluginInput, HeadRenderer, ResolvableHead, Unhead } from '../types'
import { registerPlugin } from '../unhead'

export type { ClientUnhead } from '../client/adapter'
export type { CompiledTags } from '../compiled/types'

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

/**
 * @experimental
 */
export interface LazyEntryOptions extends HeadEntryOptions {
  /**
   * Values for the dynamic values of compiled tags. A non-empty string other than `'true'` and a finite
   * number other than `0` render on the compiled runtime. Any other value loads the full runtime.
   */
  values?: readonly unknown[]
}

/**
 * @experimental
 */
export interface LazyHeadEntry<T> extends ActiveHeadEntry<T> {
  patch: (input: T | CompiledTags, options?: LazyEntryOptions) => void
}

export interface LazyUnhead<T = ResolvableHead> extends ClientUnhead<T> {
  /**
   * Adds loose input or compiled tags from `compileTags` or the bundler.
   */
  push: (input: T | CompiledTags, options?: LazyEntryOptions) => LazyHeadEntry<T>
  /**
   * Loads the runtime now. Safe to call more than once.
   * Resolves `false` if the load failed, and `onLoadError` receives the error.
   */
  load: () => Promise<boolean>
  /**
   * Blocks the load while the user changes page, including any pending idle load.
   * The next `head.render()` releases it, and loads at once if entries changed.
   * So call `head.render()` when the navigation ends, even if it aborted.
   * A direct `load()` still runs. A load already in flight finishes, and its first render
   * waits for that next `head.render()`.
   */
  blockLoad: () => void
  /**
   * Set by `acceptCompiledTags`: the compiled runtime when every entry holds compiled tags.
   *
   * @internal
   */
  _acceptsCompiled?: () => Promise<typeof import('../compiled/client')> | undefined
}

// The id offset of a claim: a copy of a server entry as it was pushed. It also makes a claim
// win a v3 dedupe tie with its entry. The compiled runtime reads it in `compiled/client`.
const CLAIM = 1e6

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
 * `TemplateParamsPlugin`, loaded only once a value holds `%`. A head with no `%`
 * renders the same with or without the plugin.
 *
 * @experimental
 */
export const lazyTemplateParams: HeadPlugin & { _load: (head: Unhead<any>) => Promise<void> } = {
  key: 'template-params',
  _load: head => import('../plugins/templateParams').then(({ TemplateParamsPlugin }) => {
    // a render that waits on this load may call it again
    if (head.plugins.get('template-params') === lazyTemplateParams) {
      head.plugins.delete('template-params')
      head.use(TemplateParamsPlugin)
    }
  }),
}

/**
 * Lets a lazy head render compiled tags on the compiled runtime, which loads instead of the
 * full runtime when every entry holds compiled tags. A head without it still takes compiled tags, through
 * the full runtime.
 *
 * Call it where the head is created when the bundler compiles head calls. The first
 * compiled call also calls it, but an idle load can start before that call, for
 * example while the router loads a page, and then picks the full runtime. Its code
 * stays out of a bundle that never calls it.
 *
 * @experimental
 */
export function acceptCompiledTags<T>(head: LazyUnhead<T>): LazyUnhead<T> {
  head._acceptsCompiled ||= () => [...head.entries.values()].every(entry => Array.isArray(entry._pending ?? entry.input))
    ? import('../compiled/client')
    : undefined
  return head
}

/**
 * Creates a client head for a server rendered page. It keeps entries without
 * touching the document, then loads the DOM runtime when the browser is idle or
 * when a change must reach the document.
 *
 * Use `createHead` from `unhead/client` for a page with no server rendered head.
 *
 * @experimental The lazy head API may change in a future minor release.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createLazyHead<T = ResolvableHead>(options: CreateLazyHeadOptions = {}): LazyUnhead<T> {
  const document = options.document || (typeof window !== 'undefined' ? window.document : undefined)
  const hooks = createHookStore(options.hooks)
  // the claim of each server entry, so a runtime can remove the server elements of an
  // entry that hydration disposed or patched
  const hydrationEntries = new Map<number, HeadEntry<T>>()
  // the claims and entries that the first runtime render adopts
  let hydrated: HeadEntry<T>[] | undefined
  let loading: Promise<boolean> | undefined
  let cancelIdle: (() => void) | undefined
  let blocked = false
  // blockLoad ran while a load was in flight, so its first render waits for the release
  let held = false
  let render: HeadRenderer<any>

  // v3 `createUnhead` and `createClientHeadAdapter` merged, for the client only. The
  // runtimes upgrade this object in place, so it keeps their shape. It batches until a
  // runtime loads, so changes reach `onChange` only.
  const entries = new Map<number, HeadEntry<T>>()
  let pushing = false
  const head = {
    _entryCount: 1,
    _h: 0,
    _b: true,
    plugins: new Map(),
    resolvedOptions: { document, propResolvers: options.propResolvers },
    ssr: false,
    entries,
    hooks,
    dirty: false,
    render: () => render(head),
    use: (p: HeadPluginInput) => registerPlugin(head, p),
    invalidate() {
      for (const entry of entries.values())
        delete entry._tags
      head.dirty = true
      notify()
    },
    push(input: T, entryOptions?: HeadEntryOptions) {
      const unhook = entryOptions?.onRendered && hooks.hook('dom:rendered', entryOptions.onRendered)
      const _i = entryOptions?._index ?? head._entryCount++
      const entryOpts: HeadEntryOptions = { ...entryOptions }
      delete entryOpts.head
      delete entryOpts.onRendered
      delete entryOpts._index
      const entry: HeadEntry<T> = { _i, input, options: entryOpts, _o: input }
      entries.set(_i, entry)
      head.dirty = true
      // During hydration a push is a page entry the server rendered, unless the adapter says
      // otherwise. Its claim keeps the input that the server rendered.
      // A hook may push inside this push, so the outer value comes back, even if a render throws.
      const outer = pushing
      pushing = !options.isClientOnlyPush?.()
      if (pushing && !hydrated && !hydrationEntries.has(_i))
        hydrationEntries.set(_i, { ...entry, _i: _i + CLAIM })
      try {
        notify()
      }
      finally {
        pushing = outer
      }
      return {
        _i,
        // Compiled tags keep their values in the entry options, and v3 replaces those options
        // when it loads, so a patch reads them through the entry. A patch replaces them
        // too, so a claim keeps the values that the server rendered.
        patch(next: T, patchOptions?: LazyEntryOptions) {
          entry.options = { ...entry.options, ...patchOptions }
          entry._pending = next
          entries.set(_i, entry)
          head.dirty = true
          notify()
        },
        dispose() {
          unhook?.()
          if (entries.delete(_i))
            head.invalidate()
        },
      }
    },
  } as unknown as LazyUnhead<T>
  function notify() {
    hooks.callHook('entries:updated', head)
    if (!head._b)
      head.render()
  }

  const markHydrated = () => {
    if (!hydrated) {
      // The server rendered an entry as pushed, or as patched if it ran the same patch. So an
      // entry that hydration disposed or patched adopts its claim. Then every entry adopts
      // as it is now, as a full runtime head renders it when hydration ends.
      hydrated = []
      for (const [i, claim] of hydrationEntries) {
        const entry = entries.get(i)
        if (!entry || entry._pending !== undefined)
          hydrated.push(claim)
      }
      // with no claim, the entries match the server and need no adoption
      head.dirty = !!hydrated[0]
      for (const entry of entries.values())
        hydrated.push({ ...entry })
    }
  }

  // the documented pause for DOM updates also blocks the load: nothing could render yet
  const isPaused = () => {
    const ctx = { shouldRender: true, tags: [] }
    hooks.callHook('dom:beforeRender', ctx)
    return !ctx.shouldRender
  }

  // During hydration a patch or dispose means the client already differs from the server,
  // so it needs the runtime now. After hydration, every change loads unless a load block or pause stops it.
  const onChange = () => {
    if (hydrated ? !blocked && !isPaused() : !pushing)
      head.load()
  }
  // A load before hydration ends adopts every claim. Hydration ends with the first load,
  // and the adoption stays, so the compiled runtime can hand it to v3.
  const adoption = () => hydrated ||= [...hydrationEntries.values()]
  // The compiled runtime passes the full runtime here when it meets anything it cannot render
  const upgrade = (runtime: Promise<any>): Promise<boolean> => runtime
    .then((r: typeof import('./runtime') | typeof import('../compiled/client')) => r.upgradeHead(head, options, adoption, upgrade))
    .then((renderer) => {
      // the runtime adopts these at its first render
      adoption()
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

  head.load = () => loading ||= upgrade(head._acceptsCompiled?.() || import('./runtime'))

  const armIdle = () => {
    if (loading || cancelIdle || !document)
      return
    const fire = () => {
      cancelIdle = undefined
      if (!isPaused()) {
        markHydrated()
        head.load()
      }
    }
    const idle = typeof requestIdleCallback === 'function'
    const id = idle ? requestIdleCallback(fire, { timeout: 2000 }) : setTimeout(fire, 100)
    cancelIdle = () => (idle ? cancelIdleCallback : clearTimeout)(id as any)
  }

  head.blockLoad = () => {
    markHydrated()
    blocked = true
    held = !!loading && !!head._b
    cancelIdle?.()
    cancelIdle = undefined
  }

  // Frameworks call this when hydration ends, and again when a paused page is ready.
  render = () => {
    blocked = held = false
    if (hydrated && head.dirty) {
      onChange()
    }
    else {
      markHydrated()
      armIdle()
    }
    return false
  }

  hooks.hook('entries:updated', onChange)
  options.plugins?.forEach(p => head.use(p))
  options.init?.forEach(e => e && head.push(e as T))
  armIdle()
  return head
}
