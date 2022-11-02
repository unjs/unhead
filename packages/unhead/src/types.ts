import type { Hookable, NestedHooks } from 'hookable'
import type { Head, HeadTag } from '@unhead/schema'
import type { HeadPlugin } from './plugin'
import type { SSRHeadPayload } from './runtime/server'

export interface ActiveHeadEntry<T> {
  patch: (resolvedInput: T) => void
  dispose: () => void
}

export type SideEffectsRecord = Record<string, () => void>

export type RuntimeMode = 'server' | 'client' | 'all'

export interface HeadEntry<T> {
  mode?: RuntimeMode
  input: T
  /**
   * Head entry index
   *
   * @internal
   */
  _i: number
  /**
   * Side effects
   *
   * @internal
   */
  _sde?: SideEffectsRecord
}

type HookResult = Promise<void> | void

export interface DomRenderTagContext { head: HeadClient; tag: HeadTag; $el: Element | null; document: Document }

export interface HeadHooks<T> {
  'entries:resolve': (head: HeadClient<T>) => HookResult
  'tag:normalise': (ctx: { tag: HeadTag; entry: HeadEntry<T> }) => HookResult
  'tags:beforeResolve': (ctx: { tags: HeadTag[] }) => HookResult
  'tags:resolve': (ctx: { tags: HeadTag[] }) => HookResult
  'render': (ctx: any) => HookResult
  // DOM render
  'dom:renderTag': (ctx: DomRenderTagContext) => HookResult
  'dom:beforeRender': (ctx: { head: HeadClient; tags: HeadTag[]; document: Document }) => HookResult
  // SSR render
  'ssr:beforeRender': (ctx: { tags: HeadTag[] }) => HookResult
  'ssr:render': (ctx: { tags: HeadTag[]; html: SSRHeadPayload }) => HookResult
}

export interface CreateHeadOptions<T> {
  plugins?: HeadPlugin<any>[]
  hooks?: NestedHooks<HeadHooks<T>>
}

export interface HeadEntryOptions {
  mode?: RuntimeMode
}

export interface HeadClient<T = Head> {
  entries: HeadEntry<T>[]
  hooks: Hookable<HeadHooks<T>>
  headEntries: () => HeadEntry<T>[]
  push: (entry: T, options?: HeadEntryOptions) => ActiveHeadEntry<T>
  resolveTags: () => Promise<HeadTag[]>
  /**
   * @internal
   */
  _flushDomSideEffects: () => void
}

