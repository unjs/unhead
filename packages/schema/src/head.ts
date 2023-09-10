import type { Hookable, NestedHooks } from 'hookable'
import type { HeadHooks } from './hooks'
import type { HeadTag, TagPosition, TagPriority } from './tags'
import type { Head } from './schema'

/**
 * Side effects are mapped with a key and their cleanup function.
 *
 * For example, `meta:data-h-4h46h465`: () => { document.querySelector('meta[data-h-4h46h465]').remove() }
 */
export type SideEffectsRecord = Record<string, () => void>

export type RuntimeMode = 'server' | 'client'

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
  mode?: RuntimeMode
  /**
   * Transformer function for the entry.
   *
   * @internal
   */
  transform?: (input: Input) => Promise<Input> | Input
  /**
   * Head entry index
   *
   * @internal
   */
  _i: number
  /**
   * Default tag position.
   *
   * @internal
   */
  tagPosition?: TagPosition['tagPosition']
  /**
   * Default tag priority.
   *
   * @internal
   */
  tagPriority?: TagPriority['tagPriority']
}

export type HeadPluginOptions = Omit<CreateHeadOptions, 'plugins'> & { mode?: RuntimeMode }

export type HeadPlugin = HeadPluginOptions | ((head: Unhead) => HeadPluginOptions)

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
  plugins?: HeadPlugin[]
  hooks?: NestedHooks<HeadHooks>
}

export interface HeadEntryOptions extends TagPosition, TagPriority {
  mode?: RuntimeMode
  transform?: (input: unknown) => unknown
  head?: Unhead
}

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
  resolveTags: () => Promise<HeadTag[]>
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
  ssr: boolean
  // dom specific runtime state
  /**
   * @internal
   */
  _dom?: DomState
  /**
   * @internal
   */
  _domUpdatePromise?: Promise<void>
  /**
   * @internal
   */
  dirty: boolean
}

export interface DomState {
  pendingSideEffects: SideEffectsRecord
  sideEffects: SideEffectsRecord
  elMap: Record<string, Element>
}
