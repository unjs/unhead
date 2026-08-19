import type { ScriptInstance } from '../scripts'
import type { CreateClientHeadOptions, HeadEntry, Unhead } from './head'
import type { HeadTag } from './tags'

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
  resolvedTags?: HeadTag[]
  tagWeight?: (tag: HeadTag) => number
}

export interface EntryResolveCtx<T> { tags: HeadTag[], entries: HeadEntry<T>[] }

export interface DomBeforeRenderCtx extends ShouldRenderContext { tags: HeadTag[] }
export interface ShouldRenderContext { shouldRender: boolean }

export interface DomRenderTagContext {
  tag: HeadTag
  id: string
  $el?: Element
  shouldRender: boolean
}
export interface SSRRenderContext { tags: HeadTag[], html: SSRHeadPayload }

interface TagResolveContext { tagMap: Map<string, HeadTag>, tags: HeadTag[] }

export interface CoreHeadHooks {
  'entries:updated': (ctx: Unhead<any>) => HookResult
  'entries:resolve': (ctx: EntryResolveCtx<any>) => SyncHookResult
  'entries:normalize': (ctx: { tags: HeadTag[], entry: HeadEntry<any> }) => SyncHookResult
  'tag:normalise': (ctx: { tag: HeadTag, entry: HeadEntry<any>, resolvedOptions: CreateClientHeadOptions }) => SyncHookResult
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
   * Fired by `renderSSRHeadSuspenseChunk` with the tags it is about to hand to
   * the client as a patch, before the entries are cleared.
   *
   * The chunk renderer serializes raw entry input and never resolves tags, so
   * this is the only place a plugin can see what a stream chunk carried. The
   * tags are normalized for inspection only; they are not what gets rendered.
   */
  'ssr:streamChunk': (ctx: { tags: HeadTag[] }) => HookResult
  'ssr:beforeRender': (ctx: ShouldRenderContext) => HookResult
  'ssr:render': (ctx: { tags: HeadTag[], options: RenderSSRHeadOptions }) => HookResult
  'ssr:rendered': (ctx: SSRRenderContext) => HookResult
}

export type ClientHeadHooks = CoreHeadHooks & DOMHeadHooks
export type ServerHeadHooks = CoreHeadHooks & SSRHeadHooks
export type HeadHooks = CoreHeadHooks & DOMHeadHooks & SSRHeadHooks
