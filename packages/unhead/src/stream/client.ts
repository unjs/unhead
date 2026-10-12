import type { ClientUnhead } from '../client/adapter'
import type { ClientHeadHooks, CreateClientHeadOptions, HeadEntry, HeadTag, ResolvableHead, Unhead } from '../types'
import type { StreamingGlobal, UnheadStreamQueue } from './types'
import { createClientHeadAdapter } from '../client/adapter'
import { UsesMergeStrategy } from '../utils/const'
import { createHooks } from '../utils/hooks'

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

function tagCovers(streamed: HeadTag, owners: Map<string, HeadTag>): boolean {
  const owner = owners.get(streamed._d || streamed._h || '')
  if (!owner)
    return false
  if (!UsesMergeStrategy.has(streamed.tag))
    return true
  // Merge tags (htmlAttrs, bodyAttrs, templateParams) combine props across
  // entries, so compare the effective client tag with every streamed prop.
  return Object.keys(streamed.props).every(key => propValueCoveredBy(owner.props[key], streamed.props[key]))
}

/**
 * Disposes streamed entries whose every tag a client entry now owns.
 *
 * Streamed patches exist so the DOM updates before hydration. Once the
 * hydrating app pushes entries covering the same tags, the streamed copies
 * are redundant: keeping them leaves orphaned tags behind when the owning
 * component unmounts.
 */
function releaseCoveredStreamedEntries(head: ClientUnhead<any>, entries: HeadEntry<any>[]) {
  if (!entries.some(entry => (entry as any)._streamed))
    return
  const owners = new Map<string, HeadTag>()
  const mergeTags: HeadTag[] = []
  for (const entry of entries) {
    if ((entry as any)._streamed)
      continue
    // The renderer populated these tags with its effective weight and input.
    // Entries excluded from resolution cannot take ownership of streamed tags.
    for (const tag of entry._tags || []) {
      // Normal tags only need an owner with the same normalized identity.
      // Their winning value and array-meta grouping do not affect coverage.
      if (UsesMergeStrategy.has(tag.tag))
        mergeTags.push(tag)
      else if (tag._d || tag._h)
        owners.set((tag._d || tag._h)!, tag)
    }
  }
  if (!owners.size && !mergeTags.length)
    return
  // Only merge tags need the renderer's weight/order and effective props.
  for (const next of mergeTags.sort((a, b) => a._w! - b._w! || a._p! - b._p!)) {
    const key = next._d || next._h || ''
    if (!key)
      continue
    const prev = owners.get(key)
    if (prev && (!next.tagDuplicateStrategy || next.tagDuplicateStrategy === 'merge')) {
      const props = { ...prev.props, ...next.props }
      if (next.props.class)
        props.class = new Set([...(prev.props.class || []) as any, ...next.props.class as any]) as any
      if (next.props.style)
        props.style = new Map([...(prev.props.style || []) as any, ...next.props.style as any]) as any
      owners.set(key, { ...next, props })
    }
    else if (!prev || (next._w === prev._w ? next._p! > prev._p! : next._w! < prev._w!)) {
      owners.set(key, next)
    }
  }
  let released = false
  for (const entry of entries) {
    if (!(entry as any)._streamed)
      continue
    if (entry._tags?.every(tag => tagCovers(tag, owners))) {
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
  let resolveContext: { entries: HeadEntry<any>[] } | undefined
  let deferredEntries: HeadEntry<any>[] | undefined
  head.hooks.hook('entries:resolve', (ctx) => {
    // Keep the context so later hooks can replace its selected entries.
    resolveContext = ctx
  })
  const queuePush = streamQueue.push.bind(streamQueue)
  streamQueue.push = (entries: any[]) => {
    streamDepth++
    try {
      queuePush(entries)
    }
    finally {
      streamDepth--
      if (streamDepth === 0 && deferredEntries) {
        const entries = deferredEntries
        deferredEntries = undefined
        releaseCoveredStreamedEntries(head, entries)
      }
    }
  }
  // Wait for resolution so batches, patches, and per-render weight overrides
  // share the renderer's ownership decision.
  head.hooks.hook('dom:rendered', () => {
    const entries = resolveContext?.entries
    resolveContext = undefined
    if (!entries)
      return
    if (streamDepth === 0)
      releaseCoveredStreamedEntries(head, entries)
    else
      deferredEntries = entries
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
