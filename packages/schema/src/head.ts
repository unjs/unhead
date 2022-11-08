import type { Hookable, NestedHooks } from 'hookable'
import type { HeadHooks } from '@unhead/schema/src/hooks'
import type { HeadTag } from './tags'
import type { Head } from './schema'

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

export type HeadPlugin = Omit<CreateHeadOptions, 'plugins'>

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

export interface CreateHeadOptions {
  plugins?: HeadPlugin[]
  hooks?: NestedHooks<HeadHooks>
}

export interface HeadEntryOptions {
  mode?: RuntimeMode
}

export interface HeadClient<T extends {} = Head> {
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
  hooks: Hookable<HeadHooks>
  /**
   * @internal
   */
  _removeQueuedSideEffect: (key: string) => void
  /**
   * @internal
   */
  _flushQueuedSideEffects: () => void
}

