import type { Script } from '@unhead/schema/src/schema'
import type { ActiveHeadEntry, CreateHeadOptions, HeadEntry, HeadEntryOptions, Unhead } from './head'
import type { HeadTag } from './tags'

export type HookResult = Promise<void> | void

export interface SSRHeadPayload {
  headTags: string
  bodyTags: string
  bodyTagsOpen: string
  htmlAttrs: string
  bodyAttrs: string
}

export type UseScriptStatus = 'awaitingLoad' | 'loading' | 'loaded' | 'error' | 'removed'

export interface ScriptInstance<T> {
  id: string
  entry?: ActiveHeadEntry<any>
  loaded: boolean
  status: UseScriptStatus
  load: () => Promise<T>
  waitForLoad: () => Promise<T>
  remove: () => boolean
}

export interface UseScriptOptions<T> extends Omit<HeadEntryOptions, 'transform'> {
  use?: () => T | undefined | null
  stub?: ((ctx: { script: ScriptInstance<T>; fn: string | symbol }) => any)
  transform?: (script: Script) => Promise<Script> | Script
  trigger?: 'idle' | 'manual' | Promise<void>
}

export type UseScriptInput = Omit<Script, 'src'> & { src: string }

export interface EntryResolveCtx<T> { tags: HeadTag[]; entries: HeadEntry<T>[] }
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
export interface SSRRenderContext { tags: HeadTag[]; html: SSRHeadPayload }

export interface HeadHooks {
  'init': (ctx: Unhead<any>) => HookResult
  'entries:updated': (ctx: Unhead<any>) => HookResult
  'entries:resolve': (ctx: EntryResolveCtx<any>) => HookResult
  'tag:normalise': (ctx: { tag: HeadTag; entry: HeadEntry<any>; resolvedOptions: CreateHeadOptions }) => HookResult
  'tags:beforeResolve': (ctx: { tags: HeadTag[] }) => HookResult
  'tags:resolve': (ctx: { tags: HeadTag[] }) => HookResult

  // @unhead/dom
  'dom:beforeRender': (ctx: DomBeforeRenderCtx) => HookResult
  'dom:renderTag': (ctx: DomRenderTagContext, document: Document, track: any) => HookResult
  'dom:rendered': (ctx: { renders: DomRenderTagContext[] }) => HookResult

  // @unhead/ssr
  'ssr:beforeRender': (ctx: ShouldRenderContext) => HookResult
  'ssr:render': (ctx: { tags: HeadTag[] }) => HookResult
  'ssr:rendered': (ctx: SSRRenderContext) => HookResult

  'script:transform': (ctx: { script: Script }) => HookResult
  'script:updated': (ctx: { script: ScriptInstance<any> }) => HookResult
}
