import type { CompiledHead, CreateCompiledServerHeadOptions } from 'unhead/v4/server-compiled'
import type { App } from 'vue'
import type { RenderSSRHeadOptions, SSRHeadPayload } from './server'
import type { VueHeadClient } from './types'
import { createHead as createCompiledHead } from 'unhead/v4/server-compiled'
import { vueInstall } from './install'
import { renderSSRHead as renderHead } from './server'

export type { RenderSSRHeadOptions, SSRHeadPayload } from './server'
export type { CompiledEntry, CompiledEntryOptions, CompiledPlan } from 'unhead/v4/server-compiled'

export interface VueCompiledServerHead extends CompiledHead {
  install: (app: App) => void
}

export type CreateHeadOptions = CreateCompiledServerHeadOptions

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateHeadOptions = {}): VueCompiledServerHead {
  const head = createCompiledHead(options) as VueCompiledServerHead
  head.install = vueInstall(head as unknown as VueHeadClient)
  return head
}

export function renderSSRHead(head: VueCompiledServerHead, options?: RenderSSRHeadOptions): SSRHeadPayload {
  return renderHead(head as unknown as VueHeadClient, options)
}
