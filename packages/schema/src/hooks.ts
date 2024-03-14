import type { CreateHeadOptions, HeadEntry, Unhead } from './head'
import type { HeadTag } from './tags'
import type { ScriptInstance, UseScriptResolvedInput } from './'

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

export interface HeadHooks {
  'init': (ctx: Unhead<any>) => HookResult
  'entries:updated': (ctx: Unhead<any>) => HookResult
  'entries:resolve': (ctx: EntryResolveCtx<any>) => HookResult
  'tag:normalise': (ctx: { tag: HeadTag, entry: HeadEntry<any>, resolvedOptions: CreateHeadOptions }) => HookResult
  'tags:beforeResolve': (ctx: { tags: HeadTag[] }) => HookResult
  'tags:resolve': (ctx: { tags: HeadTag[] }) => HookResult
  'tags:afterResolve': (ctx: { tags: HeadTag[] }) => HookResult

  // @unhead/dom
  'dom:beforeRender': (ctx: DomBeforeRenderCtx) => HookResult
  'dom:renderTag': (ctx: DomRenderTagContext, document: Document, track: any) => HookResult
  'dom:rendered': (ctx: { renders: DomRenderTagContext[] }) => HookResult

  // @unhead/ssr
  'ssr:beforeRender': (ctx: ShouldRenderContext) => HookResult
  'ssr:render': (ctx: { tags: HeadTag[] }) => HookResult
  'ssr:rendered': (ctx: SSRRenderContext) => HookResult

  'script:transform': (ctx: { script: UseScriptResolvedInput }) => HookResult
  'script:updated': (ctx: { script: ScriptInstance<any> }) => HookResult
  'script:instance-fn': (ctx: { script: ScriptInstance<any>, fn: string | symbol, args: any }) => HookResult
}
