import type { HookableCore } from 'hookable'
import type { ClientHeadHooks, DomRenderTagContext, HeadHooks, ServerHeadHooks } from './hooks'
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
   * Input marked request-stable via the `static` entry option.
   * @internal
   */
  _static?: boolean
  /**
   * Entry created from `CreateHeadOptions.init`; eligible for automatic
   * static-entry inference.
   * @internal
   */
  _init?: boolean
  /**
   * @internal
   */
  _promisesProcessed?: boolean
}

export interface HeadPluginOptions extends CreateHeadOptions {
  hooks?: Record<string, (...args: any[]) => any>
  /**
   * Execution order for this plugin's hook callbacks relative to other
   * plugins on the same hook. Lower runs earlier; default `0`. Plugins with
   * equal order run in registration order.
   */
  order?: number
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

/**
 * Process-scoped store enabling static-entry sharing across head instances.
 * Create one plain object at module scope and pass it to every
 * `createHead()` call; internals are attached lazily.
 */
export interface StaticEntryStore {
  /** @internal */
  _m?: WeakMap<object, unknown>
}

export interface CreateHeadOptions {
  document?: Document
  /**
   * Opts into static-entry sharing: head inputs that are pure (no functions,
   * promises or framework refs) and identical across requests — config-level
   * `init` entries and `static: true` pushes — are normalized, weighted and
   * dedupe-keyed once per process, with the frozen tags and their rendered
   * HTML shared across heads.
   *
   * Pass the same object (module scope) to every `createHead()` call.
   * Inputs shared this way must not be mutated in place.
   *
   * @example
   * ```ts
   * // module scope — one per process
   * const staticCache = {}
   * export default () => createHead({ staticCache })
   * ```
   */
  staticCache?: StaticEntryStore
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
   * Custom tag weight function for controlling `<head>` tag ordering.
   *
   * By default, tags are sorted using CAPO weights optimised for the browser preload scanner.
   * Override this to change the ordering — for example, to prioritise SEO meta tags for bot requests.
   *
   * @example
   * ```ts
   * import { capoTagWeight } from 'unhead/server'
   *
   * createHead({
   *   tagWeight(tag) {
   *     // Promote SEO meta above styles for bots
   *     if (isBot && tag.tag === 'meta' && tag.props.property?.startsWith('og:'))
   *       return 55 // just above styles (60)
   *     return capoTagWeight(tag)
   *   }
   * })
   * ```
   */
  tagWeight?: (tag: HeadTag) => number
  /**
   * Should default important tags be skipped.
   *
   * Adds the following tags with low priority:
   * - <html lang="en">
   * - <meta charset="utf-8">
   * - <meta name="viewport" content="width=device-width, initial-scale=1">
   */
  disableDefaults?: boolean
  /**
   * Omit line breaks between rendered tags, producing a single line of output.
   *
   * Only removes the separators *between* tags; newlines inside inline
   * `<script>`/`<style>`/JSON-LD content are preserved.
   *
   * @deprecated Prefer `MinifyPlugin` from `unhead/plugins`, which minifies the
   * inline content itself (where the real bytes are) rather than only dropping
   * separators.
   */
  omitLineBreaks?: boolean
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
   * Marks the input as identical for every request/head instance, promoting
   * it to a process-level cache on first use: normalized, weighted and
   * dedupe-keyed once, with the frozen tags shared across heads.
   *
   * The input must be plain, deterministic data — entries containing
   * functions, promises or framework refs fall back to regular per-head
   * normalization. Inputs that satisfy this are also detected automatically
   * after being normalized twice; the flag just skips the detection warmup.
   */
  static?: boolean
  /**
   * Called after unhead has finished applying DOM updates.
   *
   * Useful for synchronising external tools (e.g. analytics) with the current document head.
   *
   * Only called on the client — ignored during SSR.
   *
   * @example
   * useHead({ title: 'My Page' }, {
   *   onRendered({ renders }) {
   *     amplitude.track('Page View', { title: document.title })
   *   }
   * })
   */
  onRendered?: (ctx: { renders: DomRenderTagContext[] }) => void | Promise<void>
  /**
   * @internal
   */
  _safe?: boolean
  /**
   * @internal
   */
  _index?: number
  /**
   * Source location for devtools tracing.
   * @internal
   */
  _source?: string
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
