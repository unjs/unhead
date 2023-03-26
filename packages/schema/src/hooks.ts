import type { CreateHeadOptions, HeadEntry, Unhead } from './head'
import type { HeadTag } from './tags'
import {ResolvedHeadTag} from "./tags";

export type HookResult = Promise<void> | void

export interface SSRHeadPayload {
  headTags: string
  bodyTags: string
  bodyTagsOpen: string
  htmlAttrs: string
  bodyAttrs: string
}

export interface EntryResolveCtx<T> { tags: HeadTag[]; entries: HeadEntry<T>[] }
export interface DomRenderTagContext {
  $el?: Element | null
  tag: ResolvedHeadTag
}
export interface BeforeDOMRenderContext { shouldRender: boolean; tags: DomRenderTagContext[] }
export interface BeforeSSRRenderContext { shouldRender: boolean; tags: ResolvedHeadTag[] }

export interface SSRRenderContext { tags: ResolvedHeadTag[]; html: SSRHeadPayload }

export interface HeadHooks {
  'entries:updated': (ctx: Unhead<any>) => HookResult
  'entries:resolve': (ctx: EntryResolveCtx<any>) => HookResult
  'tag:normalise': (ctx: { tag: HeadTag; entry: HeadEntry<any>; resolvedOptions: CreateHeadOptions }) => HookResult
  'tags:resolve': (ctx: { tags: ResolvedHeadTag[]; entries: HeadEntry<any>[] }) => HookResult

  // @unhead/dom
  'dom:beforeRender': (ctx: BeforeDOMRenderContext) => HookResult
  'dom:renderTag': (ctx: DomRenderTagContext) => HookResult

  // @unhead/ssr
  'ssr:beforeRender': (ctx: BeforeSSRRenderContext) => HookResult
  'ssr:render': (ctx: { tags: ResolvedHeadTag[] }) => HookResult
  'ssr:rendered': (ctx: SSRRenderContext) => HookResult
}
