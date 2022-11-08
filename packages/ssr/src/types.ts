import type { HeadTag, HookResult } from '@unhead/schema'

export interface SSRHeadPayload {
  headTags: string
  bodyTags: string
  bodyTagsOpen: string
  htmlAttrs: string
  bodyAttrs: string
}

declare module '@unhead/schema' {
  export interface HeadHooks {
    'ssr:beforeRender': (ctx: { tags: HeadTag[] }) => HookResult
    'ssr:render': (ctx: { tags: HeadTag[]; html: SSRHeadPayload }) => HookResult
  }
}
