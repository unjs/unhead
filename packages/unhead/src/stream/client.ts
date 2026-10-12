import type { ClientUnhead } from '../client/adapter'
import type { ClientHeadHooks, CreateClientHeadOptions, HeadEntry, HeadTag, ResolvableHead, Unhead } from '../types'
import type { StreamingGlobal, UnheadStreamQueue } from './types'
import { createClientHeadAdapter } from '../client/adapter'
import { UsesMergeStrategy } from '../utils/const'
import { dedupeKey, hashTag } from '../utils/dedupe'
import { createHooks } from '../utils/hooks'
import { normalizeEntryToTags } from '../utils/normalize'

export type { StreamingGlobal, UnheadStreamQueue }

export const DEFAULT_STREAM_KEY = '__unhead__'

export interface CreateStreamableClientHeadOptions extends Omit<CreateClientHeadOptions, 'render'> {
  streamKey?: string
}

// class/style normalize to Set/Map, so prop equality must look inside them.
function samePropValue(a: unknown, b: unknown): boolean {
  if (a instanceof Set && b instanceof Set)
    return a.size === b.size && [...a].every(v => b.has(v))
  if (a instanceof Map && b instanceof Map)
    return a.size === b.size && [...a].every(([k, v]) => b.get(k) === v)
  return a === b || String(a) === String(b)
}

function entryTags(head: Unhead<any>, entry: HeadEntry<any>): HeadTag[] {
  if (entry._tags)
    return entry._tags
  const tags = normalizeEntryToTags(entry.input, head.resolvedOptions.propResolvers || [])
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]
    tag._d = dedupeKey(tag)
    if (!tag._d)
      tag._h = hashTag(tag)
  }
  return tags
}

function tagCovers(streamed: HeadTag, owners: Map<string, HeadTag[]>): boolean {
  const candidates = owners.get(streamed._d || streamed._h || '')
  if (!candidates)
    return false
  if (!UsesMergeStrategy.has(streamed.tag))
    return true
  // Merge tags (htmlAttrs, bodyAttrs, templateParams) combine props across
  // entries, so ownership only transfers when a client tag carries every prop
  // the streamed tag contributed.
  return candidates.some(owner =>
    Object.keys(streamed.props).every(key => samePropValue(owner.props[key], streamed.props[key])))
}

/**
 * Disposes streamed entries whose every tag a client entry now owns.
 *
 * Streamed patches exist so the DOM updates before hydration. Once the
 * hydrating app pushes entries covering the same tags, the streamed copies
 * are redundant: keeping them leaves orphaned tags behind when the owning
 * component unmounts.
 */
function releaseCoveredStreamedEntries(head: ClientUnhead<any>) {
  let owners: Map<string, HeadTag[]> | undefined
  let hasStreamed = false
  for (const entry of head.entries.values()) {
    if ((entry as any)._streamed) {
      hasStreamed = true
      continue
    }
    for (const tag of entryTags(head, entry)) {
      const key = tag._d || tag._h
      if (!key)
        continue
      const list = owners?.get(key)
      if (list)
        list.push(tag)
      else
        (owners ||= new Map()).set(key, [tag])
    }
  }
  if (!hasStreamed || !owners)
    return
  let released = false
  for (const [key, entry] of [...head.entries]) {
    if (!(entry as any)._streamed)
      continue
    if (entryTags(head, entry).every(tag => tagCovers(tag, owners!))) {
      head.entries.delete(key)
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
  const queuePush = streamQueue.push.bind(streamQueue)
  streamQueue.push = (entries: any[]) => {
    streamDepth++
    try {
      queuePush(entries)
    }
    finally {
      streamDepth--
    }
  }
  const push = head.push.bind(head)
  head.push = (input: any, opts?: any) => {
    const active = push(input, opts)
    if (streamDepth === 0)
      releaseCoveredStreamedEntries(head)
    return active
  }
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
