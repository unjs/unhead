import type { CreateHeadOptions, HeadEntry, Unhead } from './head'
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
export interface DomRenderTagContext {
  id: string
  $el?: Element | null
  shouldRender: boolean
  tag: HeadTag
  entry?: HeadEntry<any>
  markSideEffect: (key: string, fn: () => void) => void
}

export interface DomBeforeRenderCtx extends ShouldRenderContext {
  tags: DomRenderTagContext[]
}
export interface ShouldRenderContext { shouldRender: boolean }
export interface SSRRenderContext { tags: HeadTag[]; html: SSRHeadPayload }

export interface HeadHooks {
  'init': (ctx: Unhead<any>) => HookResult
  'entries:updated': (ctx: Unhead<any>) => HookResult
  'entries:resolve': (ctx: EntryResolveCtx<any>) => HookResult
  'tag:normalise': (ctx: { tag: HeadTag; entry: HeadEntry<any>; resolvedOptions: CreateHeadOptions }) => HookResult
  'tags:beforeResolve': (ctx: { tags: HeadTag[] }) => HookResult
  'tags:resolve': (ctx: { tags: HeadTag[] }) => HookResult

  // @unhead/dom
  'dom:beforeRender': (ctx: ShouldRenderContext & { tags: DomRenderTagContext[] }) => HookResult
  'dom:beforeRenderTag': (ctx: DomRenderTagContext) => HookResult
  'dom:renderTag': (ctx: DomRenderTagContext, document: Document) => HookResult
  'dom:rendered': (ctx: { renders: DomRenderTagContext[] }) => HookResult

  // @unhead/ssr
  'ssr:beforeRender': (ctx: ShouldRenderContext) => HookResult
  'ssr:render': (ctx: { tags: HeadTag[] }) => HookResult
  'ssr:rendered': (ctx: SSRRenderContext) => HookResult
}
