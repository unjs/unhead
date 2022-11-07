import type { Hookable, NestedHooks } from 'hookable'
import type { Head, HeadTag } from '@unhead/schema'
import type { HeadPlugin } from './plugin'
import type { SSRHeadPayload } from './runtime/server'

/**
 * An active head entry provides an API to manipulate it.
 */
export interface ActiveHeadEntry<T> {
  /**
   * Updates the entry with new input.
   *
   * Will first clear any side effects for previous input.
   */
  patch: (resolvedInput: T) => void
  /**
   * Dispose the entry, removing it from the active head.
   *
   * Will queue side effects for removal.
   */
  dispose: () => void
}

/**
 * Side effects are mapped with a key and their cleanup function.
 *
 * For example `meta:data-h-4h46h465`: () => { document.querySelector('meta[data-h-4h46h465]').remove() }
 */
export type SideEffectsRecord = Record<string, () => void>

export type RuntimeMode = 'server' | 'client' | 'all'

export interface HeadEntry<T> {
  /**
   * User provided input for the entry.
   */
  input: T
  /**
   * The mode that the entry should be used in.
   *
   * @internal
   */
  _m?: RuntimeMode
  /**
   * Head entry index
   *
   * @internal
   */
  _i: number
  /**
   * Side effects
   *
   * @internal
   */
  _sde: SideEffectsRecord
}

export type HookResult = Promise<void> | void

export interface DomRenderTagContext { head: HeadClient; tag: HeadTag; document: Document }
export interface EntryResolveCtx<T> { tags: HeadTag[]; entries: HeadEntry<T>[] }

export interface HeadHooks<T> {
  'entries:resolve': (ctx: EntryResolveCtx<T>) => HookResult
  'tag:normalise': (ctx: { tag: HeadTag; entry: HeadEntry<T> }) => HookResult
  'tags:resolve': (ctx: { tags: HeadTag[] }) => HookResult
  // DOM render
  'dom:beforeRender': (ctx: { head: HeadClient; tags: HeadTag[]; document: Document }) => HookResult
  'dom:renderTag': (ctx: DomRenderTagContext) => HookResult
  // SSR render
  'ssr:beforeRender': (ctx: { tags: HeadTag[] }) => HookResult
  'ssr:render': (ctx: { tags: HeadTag[]; html: SSRHeadPayload }) => HookResult
}

export interface CreateHeadOptions<T> {
  plugins?: HeadPlugin<any>[]
  hooks?: NestedHooks<HeadHooks<T>>
}

export interface HeadEntryOptions {
  mode?: RuntimeMode
}

export interface HeadClient<T = Head> {
  /**
   * The active head entries.
   */
  headEntries: () => HeadEntry<T>[]
  /**
   * Create a new head entry.
   */
  push: (entry: T, options?: HeadEntryOptions) => ActiveHeadEntry<T>
  /**
   * Resolve tags from head entries.
   */
  resolveTags: () => Promise<HeadTag[]>
  /**
   * Exposed hooks for easier extension.
   */
  hooks: Hookable<HeadHooks<T>>
  /**
   * @internal
   */
  _removeQueuedSideEffect: (key: string) => void
  /**
   * @internal
   */
  _flushQueuedSideEffects: () => void
}

