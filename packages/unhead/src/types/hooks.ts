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
}

export interface EntryResolveCtx<T> { tags: HeadTag[], entries: HeadEntry<T>[] }

export interface DomBeforeRenderCtx extends ShouldRenderContext {}
export interface ShouldRenderContext { shouldRender: boolean }
export interface SSRRenderContext { tags: HeadTag[], html: SSRHeadPayload }

interface TagResolveContext { tagMap: Map<string, HeadTag>, tags: HeadTag[] }

export interface HeadHooks {
  'entries:updated': (ctx: Unhead<any>) => HookResult
  'entries:resolve': (ctx: EntryResolveCtx<any>) => SyncHookResult
  'entries:normalize': (ctx: { tags: HeadTag[], entry: HeadEntry<any> }) => SyncHookResult
  'tag:normalise': (ctx: { tag: HeadTag, entry: HeadEntry<any>, resolvedOptions: CreateClientHeadOptions }) => SyncHookResult
  'tags:beforeResolve': (ctx: TagResolveContext) => SyncHookResult
  'tags:resolve': (ctx: TagResolveContext) => SyncHookResult
  'tags:afterResolve': (ctx: TagResolveContext) => SyncHookResult

  // client
  'dom:beforeRender': (ctx: DomBeforeRenderCtx) => SyncHookResult

  // server
  'ssr:beforeRender': (ctx: ShouldRenderContext) => HookResult
  'ssr:render': (ctx: { tags: HeadTag[] }) => HookResult
  'ssr:rendered': (ctx: SSRRenderContext) => HookResult

  'script:updated': (ctx: { script: ScriptInstance<any> }) => void | Promise<void>
}
