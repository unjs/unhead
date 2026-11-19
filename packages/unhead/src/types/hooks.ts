import type { ScriptInstance } from '../scripts'
import type { CreateClientHeadOptions, HeadEntry, Unhead } from './head'
import type { HeadTag, HeadTagInput, ResolvedHeadTag } from './tags'

export type HookResult = Promise<void> | void
export type SyncHookResult = void

export interface SSRHeadPayload {
  headTags: string
  bodyTags: string
  bodyTagsOpen: string
  htmlAttrs: string
  bodyAttrs: string
}

export interface RenderSSRHeadOptions {
  omitLineBreaks?: boolean
  resolvedTags?: HeadTagInput[]
  tagWeight?: (tag: ResolvedHeadTag) => number
}

export interface EntryResolveCtx<T> { tags: HeadTag[], entries: HeadEntry<T>[] }

export interface DomBeforeRenderCtx extends ShouldRenderContext { tags: ResolvedHeadTag[] }
export interface ShouldRenderContext { shouldRender: boolean }

export interface DomRenderTagContext {
  tag: ResolvedHeadTag
  id: string
  $el?: Element
  shouldRender: boolean
}
export interface SSRRenderContext { tags: ResolvedHeadTag[], html: SSRHeadPayload }

// Listeners receive resolved tags. Dispatch normalizes inserted inputs before
// the next listener runs, so insertion accepts either attribute alias.
// Index reads use HeadTag because listeners can assign legacy tags directly.
type HookTags = Omit<ResolvedHeadTag[], number | 'push' | 'unshift' | 'splice' | 'fill'> & {
  [index: number]: HeadTag
  push: (...items: HeadTagInput[]) => number
  unshift: (...items: HeadTagInput[]) => number
  splice: (start: number, deleteCount?: number, ...items: HeadTagInput[]) => ResolvedHeadTag[]
  fill: (value: HeadTagInput, start?: number, end?: number) => HookTags
}

interface TagHookContext {
  get tags(): HookTags
  set tags(tags: HeadTagInput[])
}

interface TagResolveContext extends TagHookContext { tagMap: Map<string, ResolvedHeadTag> }

export interface CoreHeadHooks {
  'entries:updated': (ctx: Unhead<any>) => HookResult
  'entries:resolve': (ctx: EntryResolveCtx<any>) => SyncHookResult
  'entries:normalize': (ctx: TagHookContext & { entry: HeadEntry<any> }) => SyncHookResult
  'tag:normalise': (ctx: { tag: ResolvedHeadTag, entry: HeadEntry<any>, resolvedOptions: CreateClientHeadOptions }) => SyncHookResult
  'tags:beforeResolve': (ctx: TagResolveContext) => SyncHookResult
  'tags:resolve': (ctx: TagResolveContext) => SyncHookResult
  'tags:afterResolve': (ctx: TagResolveContext) => SyncHookResult
  'script:updated': (ctx: { script: ScriptInstance<any> }) => void | Promise<void>
}

export interface DOMHeadHooks {
  'dom:beforeRender': (ctx: DomBeforeRenderCtx) => SyncHookResult
  /** @deprecated Not called internally. Will be removed in v4. */
  'dom:renderTag': (ctx: DomRenderTagContext, document: Document, track: (id: string, scope: string, fn: () => void) => void) => HookResult
  /** @deprecated Will be removed in v4. DOM rendering is synchronous; run post-render logic after calling `renderDOMHead()` directly. */
  'dom:rendered': (ctx: { renders: DomRenderTagContext[] }) => HookResult
}

export interface SSRHeadHooks {
  /**
   * Fired by `renderSSRHeadSuspenseChunk` with normalized tags from entries
   * pending after the shell. It runs before streamed body tags are split out.
   * It also runs before the remaining patch is serialized and entries clear.
   *
   * The chunk renderer normally serializes entry input without normalizing
   * tags. This hook supplies normalized copies for inspection. The rendered
   * patch does not use these tags. Plugin-owned shapes (`_flatMeta`, the legacy
   * `body` prop) are left for the listener to resolve.
   *
   * Synchronous: the renderer does not wait for promises before it serializes
   * the patch and clears entries.
   */
  'ssr:streamChunk': (ctx: { tags: ResolvedHeadTag[] }) => SyncHookResult
  'ssr:beforeRender': (ctx: ShouldRenderContext) => HookResult
  'ssr:render': (ctx: TagHookContext & { options: RenderSSRHeadOptions }) => HookResult
  'ssr:rendered': (ctx: SSRRenderContext) => HookResult
}

export type ClientHeadHooks = CoreHeadHooks & DOMHeadHooks
export type ServerHeadHooks = CoreHeadHooks & SSRHeadHooks
export type HeadHooks = CoreHeadHooks & DOMHeadHooks & SSRHeadHooks
