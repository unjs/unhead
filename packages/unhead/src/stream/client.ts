import type { ClientUnhead } from '../client/adapter'
import type { ClientHeadHooks, CreateClientHeadOptions, DomRenderTagContext, HeadEntry, HeadTag, ResolvableHead, Unhead } from '../types'
import type { StreamingGlobal, UnheadStreamQueue } from './types'
import { createClientHeadAdapter } from '../client/adapter'
import { createHooks } from '../utils/hooks'
import { isTagMerge, mergeTagProps } from '../utils/tagMerge'

export type { StreamingGlobal, UnheadStreamQueue }

export const DEFAULT_STREAM_KEY = '__unhead__'

export interface CreateStreamableClientHeadOptions extends Omit<CreateClientHeadOptions, 'render'> {
  streamKey?: string
}

// class/style normalize to Set/Map, so coverage must look inside them. The
// client value only needs to contain every streamed value: a superset (extra
// classes or style properties) still fully covers the streamed one.
function propValueCoveredBy(client: unknown, streamed: unknown): boolean {
  if (streamed instanceof Set && client instanceof Set) {
    for (const value of streamed) {
      if (!client.has(value))
        return false
    }
    return true
  }
  if (streamed instanceof Map && client instanceof Map) {
    for (const [key, value] of streamed) {
      if (client.get(key) !== value)
        return false
    }
    return true
  }
  return streamed === client || String(streamed) === String(client)
}

function tagCovers(streamed: HeadTag, owners: Map<string, HeadTag>, rendered: Map<string, HeadTag>): boolean {
  const key = streamed._d || streamed._h || ''
  const owner = owners.get(key)
  const effective = rendered.get(key)
  if (!owner || !effective)
    return false
  const next = owner._w! > streamed._w! || (owner._w === streamed._w && owner._p! > streamed._p!) ? owner : streamed
  if (!isTagMerge(next, next === owner ? streamed : owner))
    return owner._w! <= streamed._w!
  // Default attribute merges, explicit merges, and matching keys can retain
  // server props. Release only when client entries cover those props.
  return Object.keys(streamed.props).every(key => propValueCoveredBy(owner.props[key], streamed.props[key]) && propValueCoveredBy(effective.props[key], streamed.props[key]))
}

/**
 * Disposes streamed entries whose every tag a client entry now owns.
 *
 * Streamed patches exist so the DOM updates before hydration. Once the
 * hydrating app pushes entries covering the same tags, the streamed copies
 * are redundant: keeping them leaves orphaned tags behind when the owning
 * component unmounts.
 */
function releaseCoveredStreamedEntries(head: ClientUnhead<any>, entries: HeadEntry<any>[], renders: DomRenderTagContext[], tagMap: Map<string, HeadTag>) {
  if (!entries.some(entry => (entry as any)._streamed))
    return
  // Resolution hooks can remove tags after the entry cache was populated.
  const rendered = new Map(renders.map(({ tag }) => [tag._d || tag._h || '', tag]))
  // Virtual tags affect resolution without producing DOM render records.
  for (const key of ['titleTemplate', 'templateParams']) {
    const tag = tagMap.get(key)
    if (tag) {
      rendered.set(key, key === 'templateParams' && head.plugins.has('template-params')
        ? { ...tag, props: { ...tag.props, separator: head._separator || '|' } }
        : tag)
    }
  }
  const hooks = (head.hooks as any)._hooks
  const mutatesTags = ['tags:beforeResolve', 'tags:resolve', 'tags:afterResolve'].some(name => hooks[name]?.length)
  const clientIds = mutatesTags && new Set(entries.filter(entry => !(entry as any)._streamed).map(entry => entry._i))
  const owners = new Map<string, HeadTag>()
  const clientTags: HeadTag[] = []
  for (const entry of entries) {
    if ((entry as any)._streamed)
      continue
    // The renderer populated these tags with its effective weight and input.
    // Entries excluded from resolution cannot take ownership of streamed tags.
    for (const tag of entry._tags || []) {
      const effective = rendered.get(tag._d || tag._h || '')
      // A server winner hides the client's hook result. Replaying hooks would
      // duplicate their side effects, so retain this ambiguous streamed entry.
      if (effective && (!clientIds || clientIds.has(effective._p! >> 10)))
        clientTags.push(tag)
    }
  }
  if (!clientTags.length)
    return
  for (const next of clientTags.sort((a, b) => a._w! - b._w! || a._p! - b._p!)) {
    const key = next._d || next._h || ''
    if (!key)
      continue
    const prev = owners.get(key)
    if (prev && isTagMerge(next, prev)) {
      owners.set(key, { ...next, props: mergeTagProps(prev.props, next.props) })
    }
    else if (!prev || (next._w === prev._w ? next._p! > prev._p! : next._w! < prev._w!)) {
      owners.set(key, next)
    }
  }
  let released = false
  for (const entry of entries) {
    if (!(entry as any)._streamed)
      continue
    if (entry._tags?.every(tag => tagCovers(tag, owners, rendered))) {
      head.entries.delete(entry._i)
      released = true
    }
  }
  if (released)
    head.invalidate()
}

function installStreamedEntryRelease(head: ClientUnhead<any>, streamQueue: UnheadStreamQueue) {
  if ((head as any)._streamedRelease) {
    return
  }
  ;(head as any)._streamedRelease = true
  // Batches the queue receives are server patches, not hydration pushes.
  let streamDepth = 0
  let resolveContext: { entries: HeadEntry<any>[], tagMap: Map<string, HeadTag> } | undefined
  let deferred: { entries: HeadEntry<any>[], renders: DomRenderTagContext[], tagMap: Map<string, HeadTag> } | undefined
  head.hooks.hook('entries:resolve', (ctx) => {
    // Keep the context so later hooks can replace its selected entries.
    resolveContext = ctx as typeof ctx & { tagMap: Map<string, HeadTag> }
  })
  const queuePush = streamQueue.push.bind(streamQueue)
  streamQueue.push = (entries: any[]) => {
    streamDepth++
    try {
      queuePush(entries)
    }
    finally {
      streamDepth--
      if (streamDepth === 0 && deferred) {
        const { entries, renders, tagMap } = deferred
        deferred = undefined
        releaseCoveredStreamedEntries(head, entries, renders, tagMap)
      }
    }
  }
  // Wait for resolution so batches, patches, and per-render weight overrides
  // share the renderer's ownership decision.
  head.hooks.hook('dom:rendered', ({ renders }) => {
    const context = resolveContext
    resolveContext = undefined
    if (!context)
      return
    if (streamDepth === 0)
      releaseCoveredStreamedEntries(head, context.entries, renders, context.tagMap)
    else
      deferred = { ...context, renders }
  })
}

/**
 * Creates a client head by wrapping the core instance from the iife script.
 * Adds hooks, plugins, and dirty tracking without bundling createDomRenderer.
 */
export function createStreamableHead<T = ResolvableHead>(options: CreateStreamableClientHeadOptions = {}): ClientUnhead<T> | undefined {
  const { streamKey = DEFAULT_STREAM_KEY, ...rest } = options
  const win = typeof window !== 'undefined' ? window as any : undefined
  const streamQueue = win?.[streamKey] as UnheadStreamQueue | undefined
  const core = streamQueue?._head as Unhead<T> | undefined

  if (!core)
    return undefined

  // Already wrapped, by an earlier call or by a client bundle that built the
  // head itself. Re-wrapping would double every push, so apply what this call
  // brought and hand the existing head back. The old early return dropped
  // `hooks`, `plugins`, and `init` on the floor.
  if ((core as any)._wrapped) {
    const wrapped = core as ClientUnhead<T>
    installStreamedEntryRelease(wrapped as any, streamQueue!)
    for (const name in rest.hooks || {})
      wrapped.hooks?.hook(name as any, (rest.hooks as any)[name])
    ;(rest.plugins || []).forEach(p => wrapped.use(p))
    rest.init?.forEach(e => e && wrapped.push(e as T))
    return wrapped
  }

  const coreRender = core.render
  const hooks = createHooks<ClientHeadHooks>(rest.hooks)
  const head = createClientHeadAdapter(core as Unhead<T, boolean>, hooks, () => coreRender() as boolean)
  installStreamedEntryRelease(head as any, streamQueue!)

  // Mark as wrapped to avoid double-wrapping
  ;(head as any)._wrapped = true

  // Register plugins
  ;(rest.plugins || []).forEach(p => head.use(p))

  // Push init entries
  rest.init?.forEach(e => e && head.push(e as T))

  // Update the stream queue to use the wrapped head
  if (streamQueue)
    streamQueue._head = head as Unhead<any>

  return head
}
