import type { ClientUnhead } from '../client/adapter'
import type { StreamingGlobal } from '../stream/types'
import type { ActiveHeadEntry, ClientHeadHooks, HeadEntry, HeadRenderer } from '../types'
import type { DeferredHead } from './deferred'
import type { HeadQueue, LazyHeadOptions } from './index'
import { createClientHeadAdapter } from '../client/adapter'
import { renderLazyDOMHead } from '../client/renderDOMHead'
import { tagWeight } from '../client/tagWeight'
import { createUnhead } from '../unhead'
import { createHooks } from '../utils/hooks'
import { copyInput } from './same'
import { attachLazyStreamHead } from './stream'

function connectStream<T>(head: ClientUnhead<T>, stream: StreamingGlobal, queue: HeadQueue<T>, replayShell: () => void) {
  const live = head.entries
  const wasDiscarded = () => queue.closeStream === false
  const discard = () => {
    stream._q.length = 0
    stream.push = () => {}
    let removed = false
    for (const [id, entry] of live) {
      if (entry._streamed) {
        live.delete(id)
        removed = true
      }
    }
    if (removed)
      head.invalidate()
  }
  if (wasDiscarded()) {
    discard()
    return
  }
  queue.closeStream = discard
  // Stream patches replace hydration defaults and remain below newer client entries.
  let index = -(1 << 20)
  attachLazyStreamHead(stream, head, (input, safe) => {
    if (wasDiscarded())
      return
    const entry = head.push(input as T, { _index: index++, _streamed: true, _safe: safe })
    replayShell()
    // A user hook can leave the route in the middle of replay.
    if (wasDiscarded())
      entry.dispose()
    return entry._i
  })
}

// A change since hydration may have dropped or re-keyed an entry, leaving its server
// element unknown to the renderer. Adopt only existing elements without replaying
// historical writes, so the next render removes stale ones. Respect rendering pauses.
// Adoption reads a separate map, so an entry a hook pushes or disposes changes the live map through
// the entry, and the restore keeps that change.
function adoptHydratedEntries<T>(head: ClientUnhead<T>, adoption: Map<number, HeadEntry<T>>) {
  const live = head.entries
  // A lookup by id falls back to the live map, so a hook that disposes or pushes an entry
  // outside the adoption, such as a client only entry, still finds it. An entry is an object,
  // so `has` is a lookup that found one.
  const get = adoption.get.bind(adoption)
  adoption.get = id => get(id) || live.get(id)
  adoption.has = id => !!adoption.get(id)
  head.entries = adoption
  head.dirty = true
  try {
    return renderLazyDOMHead(head, {}, true)
  }
  finally {
    head.entries = live
    head.dirty = true
  }
}

function resolveStream(document: Document | undefined, streamKey: string) {
  const view = document?.defaultView as unknown as Record<string, StreamingGlobal> | undefined
  const stream = view?.[streamKey]
  if (!Array.isArray(stream?._q) || typeof stream.push !== 'function')
    throw new Error('[unhead] Lazy head requires the server bootstrap for this streamKey.')
  return stream
}

function activateHooks(pending: DeferredHead<unknown>['hooks']): ClientUnhead['hooks'] {
  if (!pending)
    return createHooks<ClientHeadHooks>()
  if ('callHook' in pending)
    return pending
  const active = createHooks<ClientHeadHooks>()
  const { _hooks } = pending
  // Keep references and teardown callbacks registered during setup intact.
  Reflect.deleteProperty(pending, 'hook')
  Object.assign(pending, active, { _hooks })
  return Object.setPrototypeOf(pending, Object.getPrototypeOf(active))
}

export async function activate<T>(
  options: LazyHeadOptions,
  queue: HeadQueue<T>,
  shell: DeferredHead<T>,
  connect: (head: ClientUnhead<T>) => void,
): Promise<ClientUnhead<T>> {
  const document = shell.resolvedOptions.document
  const resolveQueue = () => {
    if (options.streamKey === undefined)
      return
    const stream = resolveStream(document, options.streamKey)
    if (stream._head)
      throw new Error('[unhead] This stream already has a client head.')
    return stream
  }
  // Check before loading plugins, then again if the plugin import yielded to another task.
  let stream = resolveQueue()
  const lazyPlugins = options.lazyPlugins ? await options.lazyPlugins() : undefined
  if (options.lazyPlugins)
    stream = resolveQueue()
  let render: HeadRenderer<boolean> = () => false
  const core = createUnhead<T, boolean>(head => render(head), { document, propResolvers: options.propResolvers, _tagWeight: tagWeight })
  const hooks = shell.hooks = activateHooks(shell.hooks)
  const head = createClientHeadAdapter(core, hooks, head => render(head))
  head._b = true
  const hydrated = new Map<number, HeadEntry<T>>()
  // Apply one hydration policy to replayed entries and entries registered after load.
  function preserveHydrationOrder(active: ActiveHeadEntry<T>) {
    const live = head.entries.get(active._i)
    if (stream && active._i >= 0 && live && live._order === undefined) {
      live._order = -(1 << 21) + active._i
      const patch = active.patch
      active.patch = (input) => {
        if (!queue.hydrating)
          delete live._order
        patch(input)
      }
    }
  }
  const clientPush = head.push
  head.push = (input, entryOptions) => {
    // Keep SSR ownership until adoption, even if navigation removes the live entry.
    const baseline = queue.hydrating && !options.render && (entryOptions?._index ?? 0) >= 0
      ? { input: copyInput(input) }
      : undefined
    const active = clientPush(input, entryOptions)
    if (baseline) {
      hydrated.set(active._i, {
        _i: active._i,
        input: baseline.input,
        _o: baseline.input,
        options: head.entries.get(active._i)?.options,
      })
    }
    if (queue.hydrating)
      preserveHydrationOrder(active)
    return active
  }
  // A plugin or a hook can push through the real head or the shell during handoff.
  Object.defineProperty(head, '_entryCount', {
    get: () => queue.index,
    set: index => queue.index = index,
    configurable: true,
  })
  Object.defineProperty(head, '_scripts', {
    get: () => shell._scripts,
    set: scripts => shell._scripts = scripts,
  })
  Object.defineProperty(shell, '_dom', {
    get: () => queue.head?._dom,
    configurable: true,
  })

  const previousCloseStream = queue.closeStream
  const unhooks: (() => void)[] = []
  const hook = hooks.hook
  // Keep existing subscriptions alive across attempts. Only undo registrations
  // made by this attempt if a plugin or streamed entry causes it to fail.
  hooks.hook = (name, callback) => {
    const off = hook.call(hooks, name, callback)
    unhooks.push(off)
    return off
  }
  queue.head = head
  try {
    for (const name in options.hooks)
      hooks.hook(name as keyof ClientHeadHooks, options.hooks[name as keyof ClientHeadHooks]!)
    for (const plugin of options.plugins ?? [])
      head.use(plugin)
    for (const plugin of lazyPlugins ?? [])
      head.use(plugin)
    let pluginIndex = 0
    const registerQueuedPlugins = () => {
      while (pluginIndex < queue.plugins.length)
        head.use(queue.plugins[pluginIndex++]!)
    }
    registerQueuedPlugins()

    const replayShell = () => {
      registerQueuedPlugins()
      for (const [_i, entry] of queue.entries) {
        if (entry.active)
          continue
        const input = entry.input
        const active = entry.active = head.push(input, { ...entry.options, _index: _i })
        if (entry.hydrated)
          preserveHydrationOrder(active)
        if (entry.baseline) {
          hydrated.set(_i, {
            _i,
            input: entry.baseline,
            _o: entry.baseline,
            options: head.entries.get(_i)?.options,
          })
        }
        // The push can call a hook before the active handle is available.
        if (entry.disposed)
          active.dispose()
        else if (entry.input !== input)
          active.patch(entry.input)
        registerQueuedPlugins()
      }
    }
    replayShell()
    if (stream)
      connectStream(head, stream, queue, replayShell)
  }
  catch (error) {
    for (const off of unhooks)
      off()
    queue.head = undefined
    for (const entry of queue.entries.values())
      entry.active = undefined
    if (queue.closeStream !== false)
      queue.closeStream = previousCloseStream
    throw error
  }
  finally {
    hooks.hook = hook
    head._b = false
  }

  let renderId = 0
  render = (options.render as HeadRenderer<boolean>) || (() => {
    const id = ++renderId
    setTimeout(() => {
      if (id !== renderId)
        return
      if (hydrated.size) {
        const adoption = new Map(hydrated)
        try {
          if (!adoptHydratedEntries(head, adoption))
            return
        }
        catch (error) {
          // Historical input cannot prevent live entries from rendering. Retire this
          // batch after reporting the failed cleanup instead of retrying it forever.
          console.warn('[unhead] Failed to adopt hydrated entries.', error)
        }
        for (const [id, snapshot] of adoption) {
          if (hydrated.get(id) === snapshot)
            hydrated.delete(id)
        }
      }
      renderLazyDOMHead(head)
    })
    return false
  })

  Object.defineProperty(head, '_entryCount', { value: queue.index, writable: true })
  connect(head)
  head.render()
  return head
}

interface StreamRouter {
  afterEach: (callback: (to: { path: string }, from: { path: string }, failure?: unknown) => void) => () => void
}

function discardOnRouteExit<T>(queue: HeadQueue<T>) {
  const navigation = queue.streamRoute
  if (!navigation)
    return
  queue.streamRoute = undefined
  const [app, initialPath] = navigation
  const { $router: router, $route: route } = app.config.globalProperties as { $router?: StreamRouter, $route?: { path: string } }
  if (!router)
    return

  const discard = () => {
    const close = queue.closeStream
    queue.closeStream = false
    if (close)
      close()
  }
  if (route?.path !== initialPath) {
    discard()
    return
  }

  const remove = router.afterEach((to, from, failure) => {
    if (!failure && to.path !== from.path) {
      remove()
      discard()
    }
  })
  app.onUnmount(remove)
}

// Keep the installed object stable. Composables can keep using it after replay.
export function hydrate<T>(options: LazyHeadOptions, queue: HeadQueue<T>, shell: DeferredHead<T>, resolveRef?: (value: unknown) => unknown): Promise<void> {
  return queue.loading ||= hydrateHead(options, queue, shell, resolveRef).catch((error) => {
    queue.loading = undefined
    throw error
  })
}

async function hydrateHead<T>(options: LazyHeadOptions, queue: HeadQueue<T>, shell: DeferredHead<T>, resolveRef?: (value: unknown) => unknown): Promise<void> {
  const streamKey = options.streamKey ?? options.experimentalStreamKey ?? '__unhead__'
  const view = shell.resolvedOptions.document?.defaultView as unknown as Record<string, StreamingGlobal> | undefined
  const streamed = view?.[streamKey]
  if (streamed)
    discardOnRouteExit(queue)
  const propResolvers = resolveRef ? [(_?: string, value?: unknown) => resolveRef(value), ...options.propResolvers ?? []] : options.propResolvers
  await activate({ ...options, propResolvers, streamKey: streamed ? streamKey : undefined }, queue, shell, (head) => {
    for (const key of Object.keys(head) as (keyof typeof head)[]) {
      // The installed push can be wrapped by the framework. The other fields
      // are shared with the adapter while the runtime replays queued entries.
      if (key === 'push' || key === '_dom' || key === '_scripts' || key === 'hooks')
        continue
      Object.defineProperty(shell, key, {
        configurable: true,
        enumerable: true,
        get: () => head[key],
        set: value => Reflect.set(head, key, value),
      })
    }
    shell._load = undefined
    queue.entries.clear()
    queue.plugins.length = 0
  })
}
