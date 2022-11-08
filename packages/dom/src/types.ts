import type { HeadClient, HeadTag, HookResult } from '@unhead/schema'

export interface DomRenderTagContext { head: HeadClient; tag: HeadTag; document: Document }

declare module '@unhead/schema' {
  export interface HeadHooks {
    'dom:beforeRender': (ctx: { head: HeadClient; tags: HeadTag[]; document: Document }) => HookResult
    'dom:renderTag': (ctx: DomRenderTagContext) => HookResult
  }
}
