import type { HookableCore } from 'hookable'
import type { ClientHeadHooks, DomRenderTagContext, HeadHooks, ServerHeadHooks, SSRHeadPayload } from './hooks'
import type { ResolvableHead } from './schema'
import type { HeadTag, HeadTagTitleTemplate, ProcessesTemplateParams, ResolvesDuplicates, TagPosition, TagPriority, TemplateParams } from './tags'

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
  options?: Omit<HeadEntryOptions<Input>, 'head' | 'onRendered'>
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

export interface HeadPluginOptions<Input = ResolvableHead, RenderResult = unknown> {
  hooks?: Partial<HeadHooks<Input, RenderResult>>
}

export type HeadPluginInput<Input = ResolvableHead, RenderResult = unknown>
  = | HeadPlugin<Input, RenderResult>
    | (((head: Unhead<Input, RenderResult>) => HeadPlugin<Input, RenderResult>) & { key?: string })
export type HeadPlugin<Input = ResolvableHead, RenderResult = unknown> = HeadPluginOptions<Input, RenderResult> & { key: string }

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

export type PropResolver = (key: string | undefined, value: unknown, tag?: HeadTag) => unknown

export interface CreateHeadOptions<Input = ResolvableHead> {
  document?: Document
  /**
   * Initial head input that should be added.
   *
   * Any tags here are added with low priority.
   */
  init?: readonly (Input | undefined | false)[]
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

export interface CreateServerHeadOptions<Input = ResolvableHead, HeadInput = Input> extends CreateHeadOptions<Input> {
  plugins?: HeadPluginInput<HeadInput, SSRHeadPayload>[]
  hooks?: Partial<ServerHeadHooks<HeadInput>>
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
   *     if (isBot && tag.tag === 'meta' && typeof tag.props.property === 'string' && tag.props.property.startsWith('og:'))
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

export interface CreateStreamableServerHeadOptions<Input = ResolvableHead, HeadInput = Input> extends Omit<CreateServerHeadOptions<Input, HeadInput>, 'experimentalStreamKey'> {
  /**
   * Key used for window attachment during streaming SSR.
   * Allows multiple Unhead instances on the same page.
   * @default '__unhead__'
   */
  streamKey?: string
}

export interface CreateClientHeadOptions<Input = ResolvableHead, RenderResult = boolean> extends CreateHeadOptions<Input> {
  plugins?: HeadPluginInput<Input, RenderResult>[]
  hooks?: Partial<ClientHeadHooks<Input, RenderResult>>
  /**
   * Custom render function for DOM updates.
   */
  render?: HeadRenderer<RenderResult, Input>
}

/**
 * The render-independent part of a head instance used when adding entries.
 *
 * Keeping entry options on this smaller surface lets client and server heads
 * share the same option type without erasing their renderer result.
 */
export interface HeadEntryTarget<Input = ResolvableHead> {
  push: (entry: Input) => ActiveHeadEntry<Input>
  ssr: boolean
}

/**
 * Render-neutral value suitable for framework dependency-injection contexts.
 * It accepts standard entries while hiding renderer-specific hooks and plugins.
 */
export interface HeadContextTarget<Input = ResolvableHead> extends HeadEntryTarget<Input> {
  render: () => unknown
  use: (plugin: never) => void
}

export interface HeadEntryOptions<Input = ResolvableHead> extends TagPosition, TagPriority, ProcessesTemplateParams, ResolvesDuplicates {
  head?: HeadEntryTarget<Input>
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

/**
 * A head that can accept every entry from `BaseInput`.
 *
 * Composables that synthesize standard head entries use this constraint so a
 * head with additional optional input is accepted, while a head that requires
 * custom input on every entry is rejected.
 */
export type CompatibleHead<Input, BaseInput = ResolvableHead, RenderResult = unknown>
  = Unhead<Input, RenderResult> & ([BaseInput] extends [NoInfer<Input>] ? unknown : never)

export type HeadRenderer<RenderResult = unknown, Input = ResolvableHead> = (head: Unhead<Input, NoInfer<RenderResult>>) => RenderResult

export interface Unhead<Input = ResolvableHead, RenderResult = unknown> {
  /**
   * Render the head tags using the configured renderer.
   */
  render: () => RenderResult
  /**
   * Registered plugins.
   */
  plugins: Map<string, HeadPlugin<Input, RenderResult>>
  /**
   * The head entries.
   */
  entries: Map<number, HeadEntry<Input>>
  /**
   * Create a new head entry.
   */
  push: (entry: Input, options?: HeadEntryOptions<Input>) => ActiveHeadEntry<Input>
  /**
   * Exposed hooks for easier extension.
   */
  hooks?: HookableCore<HeadHooks<Input, RenderResult>>
  /**
   * Resolved options
   */
  resolvedOptions: CreateHeadOptions<Input>
  /**
   * Use a head plugin, loads the plugins hooks.
   */
  use: (plugin: HeadPluginInput<Input, RenderResult>) => void
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
  _scripts?: Record<string, unknown>
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
  _titleTemplate?: string | HeadTagTitleTemplate
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
