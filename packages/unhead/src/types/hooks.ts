import type { ScriptInstance } from '../scripts'
import type { CreateHeadOptions, HeadEntry, Unhead } from './head'
import type { ResolvableHead } from './schema'
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

export interface TagResolveContext { tagMap: Map<string, HeadTag>, tags: HeadTag[] }

export interface CoreHeadHooks<Input = ResolvableHead, RenderResult = unknown> {
  'entries:updated': (ctx: Unhead<Input, RenderResult>) => HookResult
  'entries:resolve': (ctx: EntryResolveCtx<Input>) => SyncHookResult
  'entries:normalize': (ctx: { tags: HeadTag[], entry: HeadEntry<Input> }) => SyncHookResult
  'tag:normalise': (ctx: { tag: HeadTag, entry: HeadEntry<Input>, resolvedOptions: CreateHeadOptions<Input> }) => SyncHookResult
  'tags:beforeResolve': (ctx: TagResolveContext) => SyncHookResult
  'tags:resolve': (ctx: TagResolveContext) => SyncHookResult
  'tags:afterResolve': (ctx: TagResolveContext) => SyncHookResult
  'script:updated': <ScriptApi extends object>(ctx: { script: ScriptInstance<ScriptApi> }) => void | Promise<void>
}

export interface DOMHeadHooks {
  'dom:beforeRender': (ctx: DomBeforeRenderCtx) => SyncHookResult
  /** @deprecated Not called internally. Will be removed in v4. */
  'dom:renderTag': (ctx: DomRenderTagContext, document: Document, track: (id: string, scope: string, fn: () => void) => void) => HookResult
  /** @deprecated Will be removed in v4. DOM rendering is synchronous; run post-render logic after calling `renderDOMHead()` directly. */
  'dom:rendered': (ctx: { renders: DomRenderTagContext[] }) => HookResult
}

export interface SSRHeadHooks {
  'ssr:beforeRender': (ctx: ShouldRenderContext) => HookResult
  'ssr:render': (ctx: { tags: HeadTag[], options: RenderSSRHeadOptions }) => HookResult
  'ssr:rendered': (ctx: SSRRenderContext) => HookResult
}

export type ClientHeadHooks<Input = ResolvableHead, RenderResult = boolean> = CoreHeadHooks<Input, RenderResult> & DOMHeadHooks
export type ServerHeadHooks<Input = ResolvableHead, RenderResult = SSRHeadPayload> = CoreHeadHooks<Input, RenderResult> & SSRHeadHooks
export type HeadHooks<Input = ResolvableHead, RenderResult = unknown> = CoreHeadHooks<Input, RenderResult> & DOMHeadHooks & SSRHeadHooks
