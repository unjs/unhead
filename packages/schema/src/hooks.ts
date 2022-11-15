import type { HeadEntry, SideEffectsRecord, Unhead } from './head'
import type { HeadTag } from './tags'

export type HookResult = Promise<void> | void

export interface SSRHeadPayload {
  headTags: string
  bodyTags: string
  bodyTagsOpen: string
  htmlAttrs: string
  bodyAttrs: string
}

export interface EntryResolveCtx<T> { tags: HeadTag[]; entries: HeadEntry<T>[] }
export interface DomRenderTagContext { $el?: Element | null; shouldRender: boolean; renderId: string, tag: HeadTag; entry?: HeadEntry<any>; staleSideEffects: SideEffectsRecord }
export interface BeforeRenderContext { shouldRender: boolean }
export interface SSRRenderContext { tags: HeadTag[]; html: SSRHeadPayload }

export interface HeadHooks {
  'init': (ctx: Unhead<any>) => HookResult
  'entries:updated': (ctx: Unhead<any>) => HookResult
  'entries:resolve': (ctx: EntryResolveCtx<any>) => HookResult
  'tag:normalise': (ctx: { tag: HeadTag; entry: HeadEntry<any> }) => HookResult
  'tags:resolve': (ctx: { tags: HeadTag[] }) => HookResult

  // @unhead/dom
  'dom:beforeRender': (ctx: BeforeRenderContext) => HookResult
  'dom:beforeRenderTag': (ctx: DomRenderTagContext) => HookResult
  'dom:renderTag': (ctx: DomRenderTagContext) => HookResult

  // @unhead/ssr
  'ssr:beforeRender': (ctx: BeforeRenderContext) => HookResult
  'ssr:render': (ctx: { tags: HeadTag[] }) => HookResult
  'ssr:rendered': (ctx: SSRRenderContext) => HookResult
}
