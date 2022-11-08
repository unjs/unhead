import type { HeadClient, HeadEntry } from './head'
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
export interface DomRenderTagContext { head: HeadClient; tag: HeadTag; document: Document }

export interface HeadHooks {
  'init': (ctx: HeadClient<any>) => HookResult
  'entries:updated': (ctx: HeadClient<any>) => HookResult
  'entries:resolve': (ctx: EntryResolveCtx<any>) => HookResult
  'tag:normalise': (ctx: { tag: HeadTag; entry: HeadEntry<any> }) => HookResult
  'tags:resolve': (ctx: { tags: HeadTag[] }) => HookResult

  // @unhead/dom
  'dom:beforeRender': (ctx: { head: HeadClient; tags: HeadTag[]; document: Document }) => HookResult
  'dom:renderTag': (ctx: DomRenderTagContext) => HookResult

  // @unhead/ssr
  'ssr:beforeRender': (ctx: { tags: HeadTag[] }) => HookResult
  'ssr:render': (ctx: { tags: HeadTag[]; html: SSRHeadPayload }) => HookResult
}
