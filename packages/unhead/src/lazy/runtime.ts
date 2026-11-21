import type { ClientUnhead } from '../client/adapter'
import type { StreamingGlobal } from '../stream/types'
import type { HeadEntry, HeadRenderer } from '../types'
import type { HeadQueue, LazyHeadOptions } from './index'
import { createClientHeadAdapter } from '../client/adapter'
import { renderLazyDOMHead } from '../client/renderDOMHead'
import { tagWeight } from '../client/tagWeight'
import { attachStreamHead } from '../stream/queue'
import { createUnhead } from '../unhead'
import { createHooks } from '../utils/hooks'

// A change since hydration may have dropped or re-keyed an entry, leaving its server
// element unknown to the renderer. Adopt only existing elements without replaying
// historical writes, so the next render removes stale ones. Respect rendering pauses.
// Adoption reads a separate map, so an entry a hook pushes or disposes changes the live map through
// the entry, and the restore keeps that change.
function adoptHydratedEntries<T>(head: ClientUnhead<T>, hydrated: HeadEntry<T>[]) {
  const live = head.entries
  const adoption = new Map(hydrated.map(entry => [entry._i, entry]))
  // A lookup by id falls back to the live map, so a hook that disposes or pushes an entry
  // outside the adoption, such as a client only entry, still finds it. An entry is an object,
  // so `has` is a lookup that found one.
  const get = adoption.get.bind(adoption)
  adoption.get = id => get(id) || live.get(id)
  adoption.has = id => !!adoption.get(id)
  head.entries = adoption
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

export async function activate<T>(
  options: LazyHeadOptions,
  queue: HeadQueue<T>,
  connect: (head: ClientUnhead<T>) => void,
): Promise<ClientUnhead<T>> {
  const document = options.document ?? globalThis.document
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
  const head = createClientHeadAdapter(core, createHooks(options.hooks), head => render(head))
  head._b = true
  // A plugin or a hook can push through the real head or the shell during handoff.
  Object.defineProperty(head, '_entryCount', {
    get: () => queue.index,
    set: index => queue.index = index,
    configurable: true,
  })

  const hydrated: HeadEntry<T>[] = []
  try {
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

    for (const [_i, entry] of queue.entries) {
      const input = entry.input
      const active = entry.active = head.push(input, { ...entry.options, _index: _i })
      if (entry.baseline) {
        hydrated.push({
          _i,
          input: entry.baseline.input,
          _o: entry.baseline.input,
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
  catch (error) {
    for (const entry of queue.entries.values())
      entry.active = undefined
    throw error
  }

  let renderId = 0
  render = (options.render as HeadRenderer<boolean>) || (() => {
    const id = ++renderId
    setTimeout(() => {
      if (id === renderId && (head._dom || !hydrated.length || adoptHydratedEntries(head, hydrated))) {
        hydrated.length = 0
        renderLazyDOMHead(head)
      }
    })
    return false
  })

  Object.defineProperty(head, '_entryCount', { value: queue.index, writable: true })
  connect(head)
  if (stream) {
    // Late server patches are fallbacks for the framework's live entries.
    let index = -(1 << 20)
    attachStreamHead(stream, head, input => head.push(input as T, { _index: index++ })._i)
  }
  head._b = false
  head.render()
  return head
}
