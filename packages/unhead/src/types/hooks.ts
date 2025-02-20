import type { ScriptInstance } from '../scripts'
import type { CreateClientHeadOptions, HeadEntry, Unhead } from './head'
import type { HeadTag } from './tags'

export type HookResult = Promise<void> | void

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
export interface DomRenderTagContext {
  id: string
  $el: Element
  shouldRender: boolean
  tag: HeadTag
  entry?: HeadEntry<any>
  markSideEffect: (key: string, fn: () => void) => void
}

export interface DomBeforeRenderCtx extends ShouldRenderContext {
  /**
   * @deprecated will always be empty, prefer other hooks
   */
  tags: DomRenderTagContext[]
}
export interface ShouldRenderContext { shouldRender: boolean }
export interface SSRRenderContext { tags: HeadTag[], html: SSRHeadPayload }

interface TagResolveContext { tagMap: Map<string, HeadTag>, tags: HeadTag[] }

export interface HeadHooks {
  'init': (ctx: Unhead<any>) => HookResult
  'entries:updated': (ctx: Unhead<any>) => HookResult
  'entries:resolve': (ctx: EntryResolveCtx<any>) => HookResult
  'entries:normalize': (ctx: { tags: HeadTag[], entry: HeadEntry<any> }) => HookResult
  'tag:normalise': (ctx: { tag: HeadTag, entry: HeadEntry<any>, resolvedOptions: CreateClientHeadOptions }) => HookResult
  'tags:beforeResolve': (ctx: TagResolveContext) => HookResult
  'tags:resolve': (ctx: TagResolveContext) => HookResult
  'tags:afterResolve': (ctx: TagResolveContext) => HookResult

  // client
  'dom:beforeRender': (ctx: DomBeforeRenderCtx) => HookResult
  'dom:renderTag': (ctx: DomRenderTagContext, document: Document, track: any) => HookResult
  'dom:rendered': (ctx: { renders: DomRenderTagContext[] }) => HookResult

  // server
  'ssr:beforeRender': (ctx: ShouldRenderContext) => HookResult
  'ssr:render': (ctx: { tags: HeadTag[] }) => HookResult
  'ssr:rendered': (ctx: SSRRenderContext) => HookResult

  'script:updated': (ctx: { script: ScriptInstance<any> }) => void | Promise<void>
}
