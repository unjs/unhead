import type { HookableCore } from 'hookable'
import type { ClientHeadHooks, HeadHooks, ServerHeadHooks } from './hooks'
import type { ResolvableHead } from './schema'
import type { HeadTag, ProcessesTemplateParams, ResolvesDuplicates, TagPosition, TagPriority, TemplateParams } from './tags'

/**
 * Side effects are mapped with a key and their cleanup function.
 *
 * For example, `meta:data-h-4h46h465`: () => { document.querySelector('meta[data-h-4h46h465]').remove() }
 */
export type SideEffectsRecord = Record<string, () => void>

export interface HeadEntry<Input> {
  /**
   * User provided input for the entry.
   */
  input: Input
  options?: {
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
    /**
     * Default tag duplicate strategy.
     *
     * @internal
     */
    tagDuplicateStrategy?: HeadTag['tagDuplicateStrategy']
    /**
     * @internal
     */
    _safe?: boolean
  }
  /**
   * Head entry index
   *
   * @internal
   */
  _i: number
  /**
   * Resolved tags
   *
   * @internal
   */
  _tags?: HeadTag[]
  /**
   * Pending patch to apply on next render (client-only)
   * @internal
   */
  _pending?: Input
  /**
   * @internal
   */
  _o?: Input
  /**
   * @internal
   */
  _promisesProcessed?: boolean
}

export interface HeadPluginOptions extends CreateHeadOptions {
  hooks?: Record<string, (...args: any[]) => any>
}

export type HeadPluginInput = HeadPluginOptions & { key: string } | ((head: Unhead) => HeadPluginOptions & { key: string })
export type HeadPlugin = HeadPluginOptions & { key: string }

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
  /**
   * @internal
   */
  _i: number
}

export type PropResolver = (key?: string, value?: any, tag?: HeadTag) => any

export interface CreateHeadOptions {
  document?: Document
  /**
   * Initial head input that should be added.
   *
   * Any tags here are added with low priority.
   */
  init?: (ResolvableHead | undefined | false)[]
  /**
   * Prop resolvers for tags.
   */
  propResolvers?: PropResolver[]
  /**
   * @experimental
   * Key used for window attachment during streaming SSR.
   * Allows multiple Unhead instances on the same page.
   * @default '__unhead__'
   */
  experimentalStreamKey?: string
  /**
   * @internal
   */
  _tagWeight?: (tag: HeadTag) => number
}

export interface CreateServerHeadOptions extends CreateHeadOptions {
  plugins?: HeadPluginInput[]
  hooks?: Partial<ServerHeadHooks>
  /**
   * Should default important tags be skipped.
   *
   * Adds the following tags with low priority:
   * - <html lang="en">
   * - <meta charset="utf-8">
   * - <meta name="viewport" content="width=device-width, initial-scale=1">
   */
  disableDefaults?: boolean
}

export interface CreateStreamableServerHeadOptions extends Omit<CreateServerHeadOptions, 'experimentalStreamKey'> {
  /**
   * Key used for window attachment during streaming SSR.
   * Allows multiple Unhead instances on the same page.
   * @default '__unhead__'
   */
  streamKey?: string
}

export interface CreateClientHeadOptions extends CreateHeadOptions {
  plugins?: HeadPluginInput[]
  hooks?: Partial<ClientHeadHooks>
  /**
   * Custom render function for DOM updates.
   */
  render?: (head: Unhead<any>) => boolean | void
}

export interface HeadEntryOptions extends TagPosition, TagPriority, ProcessesTemplateParams, ResolvesDuplicates {
  head?: Unhead
  /**
   * @internal
   */
  _safe?: boolean
  /**
   * @internal
   */
  _index?: number
}

export type HeadRenderer<T = unknown> = (head: Unhead<any, any>) => T

export interface Unhead<Input = ResolvableHead, RenderResult = unknown> {
  /**
   * Render the head tags using the configured renderer.
   */
  render: () => RenderResult
  /**
   * Registered plugins.
   */
  plugins: Map<string, HeadPlugin>
  /**
   * The head entries.
   */
  entries: Map<number, HeadEntry<Input>>
  /**
   * Create a new head entry.
   */
  push: (entry: Input, options?: HeadEntryOptions) => ActiveHeadEntry<Input>
  /**
   * Exposed hooks for easier extension.
   */
  hooks?: HookableCore<HeadHooks>
  /**
   * Resolved options
   */
  resolvedOptions: CreateHeadOptions
  /**
   * Use a head plugin, loads the plugins hooks.
   */
  use: (plugin: HeadPluginInput) => void
  /**
   * Is it a server-side render context.
   */
  ssr: boolean
  /**
   * @internal
   */
  _entryCount: number
  // client-specific (optional)
  /**
   * @internal
   */
  dirty?: boolean
  /**
   * Invalidate all entries and re-queue them for normalization.
   * @internal
   */
  invalidate?: () => void
  // dom specific runtime state
  /**
   * @internal
   */
  _dom?: DomState
  /**
   * @internal
   */
  _du?: boolean
  /**
   * @internal
   */
  _scripts?: Record<string, any>
  /**
   * @internal
   */
  _templateParams?: TemplateParams
  /**
   * @internal
   */
  _separator?: string
  /**
   * @internal
   */
  _title?: string
  /**
   * @internal
   */
  _titleTemplate?: string
  /**
   * @internal
   */
  _ssrPayload?: ResolvableHead
  /**
   * @internal
   */
  _rootStreamedTags?: Record<string, HeadTag>
}

export interface DomState {
  /**
   * @internal
   */
  _t: string
  /**
   * @internal
   */
  _p: SideEffectsRecord
  /**
   * @internal
   */
  _s: SideEffectsRecord
  /**
   * @internal
   */
  _e: Map<string, Element>
}
