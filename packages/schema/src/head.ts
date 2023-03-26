import type { Hookable, NestedHooks } from 'hookable'
import type { HeadHooks } from './hooks'
import type { Head } from './schema'
import {ResolvedHeadTag} from "./tags";

/**
 * Side effects are mapped with a key and their cleanup function.
 *
 * For example, `meta:data-h-4h46h465`: () => { document.querySelector('meta[data-h-4h46h465]').remove() }
 */
export type SideEffectsRecord = Record<string, () => void>

export type RuntimeMode = 'server' | 'client' | 'all'

export interface HeadEntry<Input> {
  /**
   * User provided input for the entry.
   */
  input: Input
  /**
   * Optional resolved input which will be used if set.
   */
  resolvedInput?: Input
  /**
   * The mode that the entry should be used in.
   *
   * @internal
   */
  _m?: RuntimeMode
  /**
   * Transformer function for the entry.
   *
   * @internal
   */
  _t?: (input: Input) => Input
  /**
   * Head entry index
   *
   * @internal
   */
  _i: number
}

export type HeadPlugin = Omit<CreateHeadOptions, 'plugins'>

export type ResolvableHeadPlugin = HeadPlugin | ((head: Unhead) => HeadPlugin)

/**
 * An active head entry provides an API to manipulate it.
 */
export interface ActiveHeadEntry<Input> {
  /**
   * Updates the entry with new input.
   *
   * Will first clear any side effects for previous input.
   */
  patch: (input: Input) => void
  /**
   * Dispose the entry, removing it from the active head.
   *
   * Will queue side effects for removal.
   */
  dispose: () => void
}

export interface CreateHeadOptions {
  domDelayFn?: (fn: () => void) => void
  document?: Document
  plugins?: ResolvableHeadPlugin[]
  hooks?: NestedHooks<HeadHooks>
}

export interface HeadEntryOptions {
  mode?: RuntimeMode
  transform?: (input: unknown) => unknown
}

export type UnheadState = Partial<Record<'hash' | 'templateParams' | 'titleTemplate' | (string & Record<never, never>), any>>

export interface Unhead<Input extends {} = Head> {
  /**
   * The active head entries.
   */
  headEntries: () => HeadEntry<Input>[]
  /**
   * Create a new head entry.
   */
  push: (entry: Input, options?: HeadEntryOptions) => ActiveHeadEntry<Input>
  /**
   * Resolve tags from head entries.
   */
  resolveTags: () => Promise<ResolvedHeadTag[]>
  /**
   * Exposed hooks for easier extension.
   */
  hooks: Hookable<HeadHooks>
  /**
   * Resolved options
   */
  resolvedOptions: CreateHeadOptions
  /**
   * Use a head plugin, loads the plugins hooks.
   */
  use: (plugin: HeadPlugin) => void

  state: UnheadState
}
